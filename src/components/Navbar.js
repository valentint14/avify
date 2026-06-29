'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS, isLinkActive } from '../lib/navigation.js';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar" aria-label="Navigare principală">
      <div className="navbar-inner">
        <span className="navbar-brand">Avify</span>
        <ul className="navbar-links" role="list">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={active ? 'navbar-link navbar-link--active' : 'navbar-link'}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
