# Architecture

- Frontend: React (Vite), AWS Amplify for auth/storage, hosted via Amplify (or GitHub Pages for docs only).
- Backend: Express on Elastic Beanstalk (EC2), integrates with OpenAI and Deezer.
- Data: MongoDB Atlas (user_songs collection with ELO ranking).
- Auth: Cognito (email/password and Google).
- Media: S3 for profile pictures.
- DNS: Route 53 -> Amplify.

A high-level diagram can be added here.