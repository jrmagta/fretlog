import 'dotenv/config';
import app from './app';
import { migrate } from './migrate';

const PORT = process.env.PORT ?? 3000;

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed', err);
    process.exit(1);
  });
