# Student Loan Announcement Popup

This package adds the Student Small Loan announcement popup to the existing
Mehanda Army Investments website. It is an integration package, not a
replacement website.

## Files and folders

- `src/components/StudentLoanAnnouncement.jsx` — the accessible popup component.
- `src/index.css` — responsive popup styling, entrance animation, and reduced
  motion support.
- `src/App.jsx` — the existing app with the popup mounted on the homepage and
  linked to the existing `student-loan` view.
- `package.json` — the existing dependencies; the popup uses `lucide-react`,
  which is already listed.

## Integration

Keep the original project files. If applying this package to another checkout,
merge the popup changes into that checkout rather than replacing its complete
`src/App.jsx` or `src/index.css`:

1. Copy `src/components/StudentLoanAnnouncement.jsx` into the same folder.
2. Add the popup CSS from `src/index.css` to the existing stylesheet.
3. In `src/App.jsx`, import `StudentLoanAnnouncement` and render it on the
   homepage with `onExplore={() => setCurrentView('student-loan')}`.
4. Keep the existing Student Loan view registered for the `student-loan`
   `currentView`; this package uses that existing route.

The popup appears after 1.5 seconds, once per browser session. It supports
keyboard dismissal, restores page scrolling when closed, and only links to the
existing informational Student Loan view. The announcement does not accept
applications or payments and labels the service as coming soon.

No `.env` files or credentials are included.
