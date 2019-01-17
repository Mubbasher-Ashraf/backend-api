import mongoose from 'mongoose'
import { Router } from 'express';
import passport from "passport";
import isEmpty from 'lodash/isEmpty';

import authenticate from '../middlewares/authenticate';
import { signup } from '../validations/auth'

// import * as userController from '../controllers/users';
// import { findUser, userValidator } from '../validators/userValidator';

const router = Router();
const User = mongoose.model('User');

async function validateInput(data, otherValidations) {
    const { errors } = otherValidations(data);

    try {
        let user = await User.findOne({ $or: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }] })

        if (user) {
            if (user.username === data.username.toLowerCase()) {
                errors.username = 'There is user with such username';
            }
            if (user.email === data.email.toLowerCase()) {
                errors.email = 'There is user with such email';
            }
        }

        return { errors, isValid: isEmpty(errors) }

    } catch (error) {
        return { errors: { ...errors, ...error }, isValid: isEmpty({ ...errors, ...error }) }
    }
}



router.post('/signup', async (req, res, next) => {
    try {
        const { errors, isValid } = await validateInput(req.body, signup)
        if (!isValid) { return res.status(500).json({ errors }) }

        const { username, email, password } = req.body;

        let user = new User();
        user.username = username;
        user.email = email;
        user.setPassword(password);
        await user.save();
        return res.status(200).json({ user: user.toAuthJSON() })
    } catch (error) {
        return res.status(500).json({ errors: error, message: 'Oops, something happen bad while proccessing your requset.' })
    }
})


router.post('/login-via-local', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return res.status(400).json({ errors: { error: err, message: 'Internal Server Error. Contact Administrator for more information.' } }) };
        if (info) { return res.status(500).json({ errors: info }) };

        return res.status(200).json({ user });
    })(req, res, next)
})

router.get('/refresh-token', authenticate, (req, res) => {
    const { id } = req.currentUser

    User.findById(id, (err, user) => {
        if (err) { return res.status(400).json({ errors: { error: err, message: 'Internal Server Error. Contact Administrator for more information.' } }) };
        if (!user) { return res.status(404).json({ errors: { form: 'Invalid User Token.' } }) };
        return res.status(200).json({ user: user.toAuthJSON() })
    });
});

router.get('reset-password/:identifier', (req, res) => {
    const { identifier } = req.params;

    User.findOne({ $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }] }, (err, user) => {
        if (err) { return res.status(400).json({ errors: { error: err, message: 'Internal Server Error. Contact Administrator for more information.' } }) };

        if (!user) return res.status(404).json({ errors: { message: 'User with such email/username doesn\'t exist in system.' } });

        return res.status(200).json({ message: 'Send reset email is not implimented yet it is still inporgress...' })
    });
});

router.get('/currentUser', authenticate, (req, res) => {
    const { id } = req.currentUser

    User.findById(id, (err, user) => {
        if (err) { return res.status(400).json({ errors: { error: err, message: 'Internal Server Error. Contact Administrator for more information.' } }) };
        if (!user) { return res.status(404).json({ errors: { form: 'Invalid User Token.' } }) };
        return res.status(200).json({ user: user.toJSON() })
    });
});

export default router;