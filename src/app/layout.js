import './globals.css';
import '../styles/board.css';
import '../styles/card.css';
import '../styles/form.css';

export const metadata = {
  title: 'Avify — Comenzi Papetărie',
  description: 'Kanban board pentru managementul comenzilor de papetărie',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
