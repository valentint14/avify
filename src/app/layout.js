import './globals.css';
import Navbar from '../components/Navbar.js';

export const metadata = {
  title: 'Avify — Comenzi Papetărie',
  description: 'Managementul comenzilor de papetărie',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
