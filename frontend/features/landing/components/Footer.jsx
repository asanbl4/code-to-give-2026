export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        <a href="/who-we-are">Who We Are</a>
        <a href="/what-we-do">What We Do</a>
        <a href="/get-involved">Get Involved</a>
        <a href="/news-stories">News & Stories</a>
        <a href="/donate">Donate</a>
      </div>
      <p className="footer-contact">
        Contact: <a href="mailto:jeff@love21foundation.com">jeff@love21foundation.com</a>
      </p>
      <p className="footer-copy">© {new Date().getFullYear()} Love 21 Foundation, Hong Kong</p>
    </footer>
  );
}
