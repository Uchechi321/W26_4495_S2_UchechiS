import { useState } from "react";
import MarketingShell from "../components/MarketingShell";

/** Change this to your team’s support inbox for production. */
const SUPPORT_EMAIL = "support@drillops.example";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [sentHint, setSentHint] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`[DrillOps] ${topic} — ${name || "Inquiry"}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`);

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSentHint(true);
  }

  return (
    <MarketingShell
      title="Contact us"
      lead="Send us a message about accounts, uploads, or how your team uses DrillOps Intelligence."
    >
      <div className="mktSection">
        <p>
          Prefer email directly? Write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#60a5fa" }}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>

      <div className="mktSection">
        <form onSubmit={handleSubmit} className="mktCard" style={{ maxWidth: 560 }}>
          <h3 style={{ marginTop: 0 }}>Message form</h3>

          <label className="mktLabel" htmlFor="contact-name">
            Your name
          </label>
          <input
            id="contact-name"
            className="mktInput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Doe"
          />

          <label className="mktLabel" htmlFor="contact-email">
            Your email
          </label>
          <input
            id="contact-email"
            type="email"
            className="mktInput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@company.com"
          />

          <label className="mktLabel" htmlFor="contact-topic">
            Topic
          </label>
          <select
            id="contact-topic"
            className="mktInput"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="general">General question</option>
            <option value="account">Account / login</option>
            <option value="upload">Uploads and reports</option>
            <option value="bug">Something looks wrong</option>
            <option value="partnership">Partnership or demo</option>
          </select>

          <label className="mktLabel" htmlFor="contact-message">
            Message
          </label>
          <textarea
            id="contact-message"
            className="mktTextarea"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            placeholder="How can we help?"
          />

          <button type="submit" className="mktBtnPrimary" style={{ width: "100%", marginTop: 8 }}>
            Open in email app
          </button>

          {sentHint && (
            <p style={{ marginTop: 12, fontSize: 14, color: "#94a3b8" }}>
              If nothing opened, copy your message and email {SUPPORT_EMAIL} manually.
            </p>
          )}
        </form>
      </div>
    </MarketingShell>
  );
}

