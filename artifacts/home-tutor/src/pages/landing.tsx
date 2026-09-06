import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  Mic,
  BrainCircuit,
  LineChart,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Target
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const FADE_UP: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const STAGGER: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="Home Tutor" className="h-10 w-10 object-contain" />
          <span className="font-serif font-bold text-xl text-primary tracking-tight">Home Tutor</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`${basePath}/sign-in`} className="text-sm font-medium text-foreground hover:text-primary transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link href={`${basePath}/sign-up`}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 shadow-sm">
              Free Trial
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={STAGGER}
            className="max-w-2xl"
          >
            <motion.div variants={FADE_UP} className="mb-6">
              <Badge variant="secondary" className="bg-secondary/15 text-secondary-foreground border-0 px-4 py-1.5 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2 inline-block text-secondary" />
                The AI Private Tutor for Indian Families
              </Badge>
            </motion.div>
            <motion.h1 variants={FADE_UP} className="text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-foreground">
              The tutor that <span className="text-primary italic">knows</span> your child's world.
            </motion.h1>
            <motion.p variants={FADE_UP} className="text-lg lg:text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg">
              A warm, patient voice tutor that learns from their exact school syllabus, diagnoses misconceptions, and builds unshakeable confidence. You see the progress, they feel the success.
            </motion.p>
            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row gap-4">
              <Link href={`${basePath}/sign-up`}>
                <Button size="lg" className="w-full sm:w-auto text-base rounded-full px-8 h-14 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Start Your Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href={`${basePath}/sign-in`}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base rounded-full px-8 h-14 border-border hover:bg-muted">
                  Sign in
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={FADE_UP} className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p>Separate, secure access for parents and students</p>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
          >
            <div className="absolute inset-0 bg-primary/5 mix-blend-multiply z-10 rounded-3xl" />
            <img 
              src={`${basePath}/hero-tutor.jpg`} 
              alt="Parent and child studying together" 
              className="w-full h-full object-cover rounded-3xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Philosophy / Features Bento */}
      <section className="py-24 bg-card px-6 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={FADE_UP}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-4xl font-bold mb-6 text-foreground">A premium learning experience.</h2>
            <p className="text-xl text-muted-foreground">We don't do generic chatbot answers. We built a system that deeply understands what your child is learning in school right now.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
              className="bg-background rounded-3xl p-8 shadow-sm border border-border flex flex-col lg:col-span-2 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-primary/10 transition-colors duration-700" />
              <BookOpen className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 font-serif">Aligned to Their School</h3>
              <p className="text-muted-foreground leading-relaxed max-w-lg">
                Built on a Cambridge Class 6 and Phoenix Greens baseline, but it immediately adapts to you. Upload your child's worksheets, textbook pages, and past papers. The tutor prioritizes your materials over everything else.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
              className="bg-background rounded-3xl p-8 shadow-sm border border-border flex flex-col relative overflow-hidden group"
            >
              <div className="absolute inset-0 z-0">
                <img src={`${basePath}/voice-tutor.jpg`} alt="Voice AI" className="w-full h-full object-cover opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700" />
              </div>
              <div className="relative z-10">
                <Mic className="w-10 h-10 text-secondary mb-6" />
                <h3 className="text-2xl font-bold mb-4 font-serif">Adaptive Voice Tutoring</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Like a real teacher sitting beside them. It speaks, listens, and adjusts its pacing. No typing required—just natural conversation.
                </p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
              className="bg-background rounded-3xl p-8 shadow-sm border border-border flex flex-col"
            >
              <BrainCircuit className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 font-serif">Misconception Diagnosis</h3>
              <p className="text-muted-foreground leading-relaxed">
                It doesn't just give the right answer. It asks probing questions to find out <em>why</em> they got it wrong, then targets that exact gap.
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
              className="bg-background rounded-3xl p-8 shadow-sm border border-border flex flex-col"
            >
              <Target className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 font-serif">Spaced Revision</h3>
              <p className="text-muted-foreground leading-relaxed">
                Never forget a concept. The tutor tracks mastery over time and automatically reintroduces weak spots just before they slip away.
              </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
              className="bg-background rounded-3xl p-8 shadow-sm border border-border flex flex-col relative overflow-hidden group"
            >
               <div className="absolute inset-0 z-0">
                <img src={`${basePath}/dashboard-tutor.jpg`} alt="Parent Dashboard" className="w-full h-full object-cover opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700" />
              </div>
              <div className="relative z-10">
                <LineChart className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-2xl font-bold mb-4 font-serif">Parent Progress Dashboard</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Total visibility without hovering. See exactly what they studied, where they struggled, and how they improved today.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-4xl font-bold mb-6 font-serif"
          >
            Simple, transparent pricing.
          </motion.h2>
          <motion.p 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-xl text-muted-foreground"
          >
            We focus on quality, not false promises. High-quality tutoring takes deep computational power, and our transparent pricing reflects that.
          </motion.p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-stretch">
          {/* Free Tier */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
          >
            <Card className="p-8 h-full bg-card border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold font-serif mb-2">Free Trial</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-bold">₹0</span>
              </div>
              <p className="text-muted-foreground mb-8">Perfect for seeing how the tutor adapts to your child.</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>One 30-minute tutoring session</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>Voice and text interactions</span>
                </li>
              </ul>
              <Link href={`${basePath}/sign-up`}>
                <Button variant="outline" className="w-full rounded-full h-12 text-base border-primary text-primary hover:bg-primary/5">
                  Start Free Trial
                </Button>
              </Link>
            </Card>
          </motion.div>

          {/* Paid Tier */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
          >
            <Card className="p-8 h-full bg-primary text-primary-foreground border-0 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <ShieldCheck className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary mb-4">Most Popular</Badge>
                <h3 className="text-2xl font-bold font-serif mb-2">Premium Monthly</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-bold">₹6,999</span>
                  <span className="text-primary-foreground/80">/ month</span>
                </div>
                <p className="text-primary-foreground/80 mb-8">A fraction of the cost of a human private tutor, available exactly when they need it.</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span><strong>30 tutoring hours</strong> per month</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span>Upload all their school materials</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span>Parent progress dashboard & insights</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span>Persistent spaced revision memory</span>
                  </li>
                </ul>
                <div className="pt-4 border-t border-primary-foreground/20 mb-8">
                  <p className="text-sm text-primary-foreground/80">
                    Allowance resets monthly. Additional hours billed at ₹199/hour if needed.
                  </p>
                </div>
                <Link href={`${basePath}/sign-up`}>
                  <Button className="w-full rounded-full h-12 text-base bg-background text-primary hover:bg-background/90 shadow-lg">
                    Get Started
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-card px-6 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-6 font-serif">Questions? We have answers.</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-border">
                <AccordionTrigger className="text-left text-lg font-medium hover:text-primary">
                  How do parents and students log in?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                  Parents create the main account and manage billing. From the settings area, parents can generate a secure one-time link code. Students then use that code to safely link their own profile on their tablet or laptop.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-border">
                <AccordionTrigger className="text-left text-lg font-medium hover:text-primary">
                  What subjects do you support?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                  We support core subjects including Math, Science, and English. Our baseline knowledge is tuned to the Cambridge Class 6 syllabus, but it completely adapts to whatever materials you upload.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-border">
                <AccordionTrigger className="text-left text-lg font-medium hover:text-primary">
                  What materials should I upload?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                  We recommend uploading school worksheets, syllabus outlines, textbook pages, and graded tests. The AI tutor prioritizes these documents over general knowledge to ensure its teaching exactly matches their classroom experience.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-border">
                <AccordionTrigger className="text-left text-lg font-medium hover:text-primary">
                  What happens when we use all 30 hours?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                  The 30-hour allowance resets automatically on your monthly billing date. If your child is studying heavily for exams and wants to study more in a given month, additional hours are available on a simple, transparent pay-as-you-go basis for ₹199 per hour.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 px-6 border-t border-border text-center">
        <div className="flex justify-center items-center gap-3 mb-6">
          <img src={`${basePath}/logo.svg`} alt="Home Tutor" className="h-8 w-8 object-contain opacity-80" />
          <span className="font-serif font-semibold text-lg text-foreground opacity-80">Home Tutor</span>
        </div>
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Home Tutor. Empowering Indian families.
        </p>
      </footer>
    </div>
  );
}
