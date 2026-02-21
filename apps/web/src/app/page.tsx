import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="landing-page">
      {/* ── Navigation ── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <Image src="/milo.png" alt="Milo mascot" width={40} height={40} />
          <span className="landing-nav-title">BrightPath</span>
        </div>
        <div className="landing-nav-actions">
          <Link href="/auth/login" className="btn btn-ghost">
            Log In
          </Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            Make Math Feel Like a <span className="text-gradient">Game</span>
          </h1>
          <p className="landing-hero-sub">
            BrightPath uses AI to create personalized math quests for your child.
            Aligned with the CBC curriculum, powered by adaptive learning, and
            wrapped in an experience kids actually love.
          </p>
          <div className="landing-hero-actions">
            <Link href="/auth/register" className="btn btn-quest btn-xl">
              🚀 Start Free Today
            </Link>
            <Link href="/auth/login" className="btn btn-outline btn-xl">
              I Have an Account
            </Link>
          </div>
          <p className="landing-hero-trust">
            ✨ No credit card needed &bull; Grade 1–9 &bull; CBC-aligned
          </p>
        </div>
        <div className="landing-hero-visual">
          <div className="landing-mascot-float">
            <Image
              src="/milo.png"
              alt="Milo the math buddy"
              width={280}
              height={280}
              priority
            />
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">How It Works</h2>
        <p className="landing-section-sub">Three simple steps to math confidence</p>
        <div className="landing-steps">
          <div className="landing-step-card">
            <span className="landing-step-num">1</span>
            <span className="landing-step-emoji">👤</span>
            <h3>Create an Account</h3>
            <p>Sign up as a parent and add your child&apos;s profile in seconds.</p>
          </div>
          <div className="landing-step-card">
            <span className="landing-step-num">2</span>
            <span className="landing-step-emoji">🎮</span>
            <h3>They Play &amp; Learn</h3>
            <p>
              Kids embark on math quests with Milo, tackling adaptive challenges
              with hints and rewards.
            </p>
          </div>
          <div className="landing-step-card">
            <span className="landing-step-num">3</span>
            <span className="landing-step-emoji">📊</span>
            <h3>You Track Progress</h3>
            <p>
              See mastery scores, accuracy trends, and personalized recommendations
              on your parent dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="landing-section landing-section-alt">
        <h2 className="landing-section-title">Why Parents Love BrightPath</h2>
        <div className="landing-benefits">
          <div className="landing-benefit-card">
            <span className="benefit-icon">🤖</span>
            <h3>AI-Powered Questions</h3>
            <p>
              Every question adapts to your child&apos;s level. Too easy? It gets harder.
              Struggling? It provides hints and scaffolding.
            </p>
          </div>
          <div className="landing-benefit-card">
            <span className="benefit-icon">📚</span>
            <h3>CBC Curriculum Aligned</h3>
            <p>
              Topics mapped directly to the Kenyan CBC mathematics standards for
              Grades 1–9.
            </p>
          </div>
          <div className="landing-benefit-card">
            <span className="benefit-icon">🏆</span>
            <h3>Gamified Learning</h3>
            <p>
              Coins, levels, streaks, and a friendly mascot keep kids motivated
              and coming back for more.
            </p>
          </div>
          <div className="landing-benefit-card">
            <span className="benefit-icon">👁️</span>
            <h3>Parent Insights</h3>
            <p>
              Detailed dashboards show exactly where your child excels and where
              they need support.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <h2>Ready to Transform Math Time?</h2>
        <p>Join BrightPath today and watch your child fall in love with math.</p>
        <Link href="/auth/register" className="btn btn-quest btn-xl">
          🚀 Get Started — It&apos;s Free
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p>&copy; 2026 BrightPath. Making math magical, one quest at a time. ✨</p>
      </footer>
    </main>
  );
}
