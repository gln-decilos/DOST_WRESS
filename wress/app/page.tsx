
import Footer from "@/components/landing/footer"
import Navbar from "@/components/landing/navbar"
import HeroSection from "@/sections/hero-section"
import FeaturesSection from "@/sections/features-section"
import TeamSection from "@/sections/team-section"
import TestimonialSection from "@/sections/testimonial-section"
import PricingSection from "@/sections/pricing-section"
import CTASection from "@/sections/cta-section"

export default function Page() {
  return (
    <>

      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </>
  )
}