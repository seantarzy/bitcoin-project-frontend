import Link from "next/link";
export const metadata = { title: "Privacy · Bitcoin in real life" };
export default function Privacy() {
  return (
    <main className="wrap privacy-page">
      <Link href="/">← Back to the possibilities</Link>
      <h1>A little clarity.</h1>
      <p>
        This calculator works without a wallet connection or an account. Use
        hypothetical amounts; you never need to disclose what you own.
      </p>
      <h2>Your inputs</h2>
      <p>
        Calculations happen in your browser. Saved goals stay in this browser’s
        local storage. Clear this site’s browser data to remove them. Our custom
        analytics events do not include your BTC amount, goal name, or budget.
      </p>
      <h2>The Daily Bitcoin newsletter</h2>
      <p>
        If you sign up, we store your email, optional hypothetical BTC amount,
        frequency, consent date and subscription status on Netlify. Resend
        processes your email to deliver confirmation and newsletter messages
        once delivery is enabled. Pending early-access signups receive a
        confirmation request before regular editions. Private links let you
        confirm, change preferences or unsubscribe. We retain an unsubscribe
        record to prevent further mail. Newsletter inputs are not sent to Google
        Analytics. Voting uses an anonymous browser cookie to update one vote
        per edition; clearing cookies can reset this identifier.
      </p>
      <h2>Sharing</h2>
      <p>
        Copying a comparison link includes the hypothetical amount, the selected
        item, and its budget in the link’s fragment. Anyone with that link can
        read those values. Downloaded images include the hypothetical amount,
        comparison, example budget and quote date. Only share values you want
        others to see.
      </p>
      <h2>Site analytics</h2>
      <p>
        When enabled on the production site, Google Analytics measures visits
        and interactions such as category selections, comparison opens and share
        actions. Google Analytics may use cookies and process device and usage
        information. Browser privacy controls or analytics blockers can limit
        this collection. Custom events exclude calculator values, and the
        configured page address excludes the sharing fragment.
      </p>
      <h2>External services</h2>
      <p>
        The site retrieves exchange rates and historical prices from Coinbase
        through our server. Our hosting provider processes ordinary request
        information to serve the site. External links are governed by the
        destination’s own privacy practices.
      </p>
      <h2>About the comparisons</h2>
      <p>
        Calculator budgets are editable illustrations. Daily Bitcoin editions
        instead preserve a specific merchant listing price and verification
        timestamp; check the merchant for current stock and pricing. Neither is
        a guarantee of bulk inventory or Bitcoin payment acceptance. These are
        not purchase offers. Bitcoin conversion values exclude fees and taxes.
        This is a tool for perspective, not financial advice.
      </p>
    </main>
  );
}
