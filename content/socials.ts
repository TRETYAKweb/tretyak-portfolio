/** Contacts shared by the menu and the footer */

export const EMAIL = "tretyakbro@gmail.com";

/** Opens Gmail's compose window, as the reference does */
export const MAIL_HREF = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}`;

/** Google Drive direct download of the CV (file id from the share link) */
export const CV_HREF = "https://drive.google.com/uc?export=download&id=1Cl7kvMZmwMkL8ln1Sh0HC4A59Na-_pYs";

/** In menu order; `group` is the footer row the link goes in */
export const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-tretyak/", group: "Social" },
  { label: "Instagram", href: "https://www.instagram.com/tretyak_bro/", group: "Social" },
  { label: "Behance", href: "https://www.behance.net/tretyak_design", group: "Portfolio" },
  { label: "Dribbble", href: "https://dribbble.com/tretyak_design", group: "Portfolio" },
  { label: "GitHub", href: "https://github.com/TRETYAKweb", group: "Elsewhere" },
  { label: "Telegram", href: "https://t.me/tretyak_bro", group: "Elsewhere" },
] as const;
