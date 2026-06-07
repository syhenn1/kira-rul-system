import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './lib/prisma';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:3001/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email provided by Google'));

        let user = await prisma.user.findFirst({
          where: { OR: [{ google_id: profile.id }, { email }] },
        });

        if (user) {
          if (!user.google_id) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { google_id: profile.id },
            });
          }
        } else {
          user = await prisma.user.create({
            data: {
              name: profile.displayName || email.split('@')[0] || email,
              email,
              google_id: profile.id,
              profile_picture: profile.photos?.[0]?.value,
            },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;
