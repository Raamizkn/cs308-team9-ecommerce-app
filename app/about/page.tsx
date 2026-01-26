import { PixelHeader } from "@/components/pixel-header"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#e8f4f8]">
      <PixelHeader />
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl md:text-6xl text-[#5b3a8f] mb-6 pixel-shadow">
            ABOUT PIXELVAULT
          </h1>
          <p className="text-xl text-[#2c3e50] max-w-3xl mx-auto leading-relaxed">
            Your premier destination for premium playing cards, trading cards, and collectible card games
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Mission Section */}
          <section className="bg-white border-4 border-black p-8 pixel-shadow">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-[#5b3a8f] mb-4">OUR MISSION</h2>
            <p className="text-[#2c3e50] leading-relaxed mb-4">
              PixelVault was created to provide card game enthusiasts and collectors with a trusted marketplace for
              premium playing cards, trading cards, and collectible card games. We believe in quality, authenticity,
              and bringing together card game communities.
            </p>
            <p className="text-[#2c3e50] leading-relaxed">
              Every deck in our collection is carefully curated to ensure quality, authenticity, and that perfect
              feel that brings joy to card players, collectors, and game enthusiasts alike.
            </p>
          </section>

          {/* What We Offer */}
          <section className="bg-[#4ecdc4] border-4 border-black p-8 pixel-shadow">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-black mb-6">WHAT WE OFFER</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Playing Cards</h3>
                <p className="text-[#2c3e50]">
                  Premium decks for poker, bridge, and casual card games from top manufacturers
                </p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Trading Cards</h3>
                <p className="text-[#2c3e50]">Collectible trading cards from popular games and franchises</p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Card Games</h3>
                <p className="text-[#2c3e50]">Complete card game sets and expansions for your collection</p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Accessories</h3>
                <p className="text-[#2c3e50]">
                  Card sleeves, deck boxes, and other accessories to protect and organize your collection
                </p>
              </div>
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="bg-[#ffb347] border-4 border-black p-8 pixel-shadow">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-black mb-6">WHY PIXELVAULT?</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-2xl"></span>
                <div>
                  <strong className="text-[#2c3e50]">Authentic Products:</strong>
                  <span className="text-[#2c3e50]"> Every deck is verified for authenticity and quality</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl"></span>
                <div>
                  <strong className="text-[#2c3e50]">Wide Selection:</strong>
                  <span className="text-[#2c3e50]"> From classic designs to modern collectibles</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl"></span>
                <div>
                  <strong className="text-[#2c3e50]">Premium Quality:</strong>
                  <span className="text-[#2c3e50]"> Professional-grade cards from trusted manufacturers</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl"></span>
                <div>
                  <strong className="text-[#2c3e50]">Fast Shipping:</strong>
                  <span className="text-[#2c3e50]"> Secure packaging and reliable delivery to your door</span>
                </div>
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-white border-4 border-black p-8 pixel-shadow text-center">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-[#5b3a8f] mb-4">NEED HELP?</h2>
            <p className="text-[#2c3e50] leading-relaxed mb-6">
              Have questions about our products, orders, or need assistance? Our support team is here to help.
              Use the live chat feature on any page to get in touch with us.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
