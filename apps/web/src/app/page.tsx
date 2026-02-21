"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import FloatingDecor from "./components/FloatingDecor";

export default function LandingPage() {
  return (
    <main className="landing-page relative overflow-hidden">
      <FloatingDecor />

      {/* ── Navigation ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="landing-nav relative z-10"
      >
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
      </motion.nav>

      {/* ── Hero ── */}
      <section className="landing-hero relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
          className="landing-hero-content"
        >
          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="landing-hero-title"
          >
            Make Math Feel Like a <span className="text-gradient">Game</span>
          </motion.h1>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="landing-hero-sub"
          >
            BrightPath uses AI to create personalized math quests for your child.
            Aligned with the CBC curriculum, powered by adaptive learning, and
            wrapped in an experience kids actually love.
          </motion.p>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="landing-hero-actions"
          >
            <Link href="/auth/register" className="btn btn-quest btn-xl">
              🚀 Start Free Today
            </Link>
            <Link href="/auth/login" className="btn btn-outline btn-xl">
              I Have an Account
            </Link>
          </motion.div>
          <motion.p
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 1, delay: 0.8 } }
            }}
            className="landing-hero-trust"
          >
            ✨ No credit card needed &bull; Grade 1–9 &bull; CBC-aligned
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="landing-hero-visual"
        >
          <div className="landing-mascot-float">
            <Image
              src="/milo.png"
              alt="Milo the math buddy"
              width={280}
              height={280}
              priority
            />
          </div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="landing-section relative z-10"
      >
        <h2 className="landing-section-title">How It Works</h2>
        <p className="landing-section-sub">Three simple steps to math confidence</p>
        <div className="landing-steps">
          <motion.div whileHover={{ y: -5 }} className="landing-step-card">
            <span className="landing-step-num">1</span>
            <span className="landing-step-emoji">👤</span>
            <h3>Create an Account</h3>
            <p>Sign up as a parent and add your child&apos;s profile in seconds.</p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="landing-step-card">
            <span className="landing-step-num">2</span>
            <span className="landing-step-emoji">🎮</span>
            <h3>They Play &amp; Learn</h3>
            <p>
              Kids embark on math quests with Milo, tackling adaptive challenges
              with hints and rewards.
            </p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="landing-step-card">
            <span className="landing-step-num">3</span>
            <span className="landing-step-emoji">📊</span>
            <h3>You Track Progress</h3>
            <p>
              See mastery scores, accuracy trends, and personalized recommendations
              on your parent dashboard.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Benefits ── */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="landing-section landing-section-alt relative z-10"
      >
        <h2 className="landing-section-title">Why Parents Love BrightPath</h2>
        <div className="landing-benefits">
          <motion.div whileHover={{ y: -5 }} className="landing-benefit-card">
            <span className="benefit-icon">🤖</span>
            <h3>AI-Powered Questions</h3>
            <p>
              Every question adapts to your child&apos;s level. Too easy? It gets harder.
              Struggling? It provides hints and scaffolding.
            </p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="landing-benefit-card">
            <span className="benefit-icon">📚</span>
            <h3>CBC Curriculum Aligned</h3>
            <p>
              Topics mapped directly to the Kenyan CBC mathematics standards for
              Grades 1–9.
            </p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="landing-benefit-card">
            <span className="benefit-icon">🏆</span>
            <h3>Gamified Learning</h3>
            <p>
              Coins, levels, streaks, and a friendly mascot keep kids motivated
              and coming back for more.
            </p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="landing-benefit-card">
            <span className="benefit-icon">👁️</span>
            <h3>Parent Insights</h3>
            <p>
              Detailed dashboards show exactly where your child excels and where
              they need support.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="landing-cta relative z-10"
      >
        <h2>Ready to Transform Math Time?</h2>
        <p>Join BrightPath today and watch your child fall in love with math.</p>
        <Link href="/auth/register" className="btn btn-quest btn-xl">
          🚀 Get Started — It&apos;s Free
        </Link>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p>&copy; 2026 BrightPath. Making math magical, one quest at a time. ✨</p>
      </footer>
    </main>
  );
}
