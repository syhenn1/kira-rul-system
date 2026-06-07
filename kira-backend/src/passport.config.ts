import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

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

          // Auto-join the first company if one exists (single-tenant setup)
          const company = await prisma.company.findFirst();
          if (company) {
            await prisma.companyMember.create({
              data: { id_user: user.id, id_perusahaan: company.id, role: 'Member' },
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;
