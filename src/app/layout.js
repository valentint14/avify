import './globals.css';
import '../styles/form.css';

export const metadata = {
  title: 'Avify — Comenzi Papetărie',
  description: 'Managementul comenzilor de papetărie',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
