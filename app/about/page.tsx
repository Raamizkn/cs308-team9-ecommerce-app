export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#e8f4f8]">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-[family-name:var(--font-pixel)] text-4xl md:text-6xl text-[#5b3a8f] mb-6 pixel-shadow">
            ABOUT PIXELVAULT
          </h1>
          <p className="text-xl text-[#2c3e50] max-w-3xl mx-auto leading-relaxed">
            Your premier destination for limited-edition pixelated digital collectibles
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Mission Section */}
          <section className="bg-white border-4 border-black p-8 pixel-shadow">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-[#5b3a8f] mb-4">OUR MISSION</h2>
            <p className="text-[#2c3e50] leading-relaxed mb-4">
              PixelVault was created to celebrate the art of pixel design and provide a marketplace where digital
              artists and collectors can connect. We believe in the power of retro aesthetics combined with modern
              technology.
            </p>
            <p className="text-[#2c3e50] leading-relaxed">
              Every item in our collection is carefully curated to ensure quality, uniqueness, and that nostalgic 8-bit
              charm that brings joy to tech enthusiasts and art lovers alike.
            </p>
          </section>

          {/* What We Offer */}
          <section className="bg-[#4ecdc4] border-4 border-black p-8 pixel-shadow">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-black mb-6">WHAT WE OFFER</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Pixel Avatars</h3>
                <p className="text-[#2c3e50]">
                  Unique character designs perfect for profiles, games, and digital identity
                </p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Game Sprites</h3>
                <p className="text-[#2c3e50]">Ready-to-use sprites for your indie game projects and creative works</p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">Collectible Art</h3>
                <p className="text-[#2c3e50]">Limited-edition pieces from talented pixel artists around the world</p>
              </div>
              <div className="bg-white border-4 border-black p-6">
                <h3 className="font-bold text-[#5b3a8f] mb-2 text-lg">UI Elements</h3>
                <p className="text-[#2c3e50]">
                  Icons, buttons, and interface components for your retro-styled projects
                </p>
              </div>
            </div>
          </section>

          {/* Why Choose Us */}
          <section className="bg-[#ffb347] border-4 border-black p-8 pixel-shadow">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-black mb-6">WHY PIXELVAULT?</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <strong className="text-[#2c3e50]">Curated Collection:</strong>
                  <span className="text-[#2c3e50]"> Every item is handpicked for quality and style</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <strong className="text-[#2c3e50]">Limited Editions:</strong>
                  <span className="text-[#2c3e50]"> Exclusive items with limited availability</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">💎</span>
                <div>
                  <strong className="text-[#2c3e50]">High Quality:</strong>
                  <span className="text-[#2c3e50]"> Professional-grade pixel art from talented creators</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <strong className="text-[#2c3e50]">Instant Delivery:</strong>
                  <span className="text-[#2c3e50]"> Download your purchases immediately after checkout</span>
                </div>
              </li>
            </ul>
          </section>

          {/* Community */}
          <section className="bg-white border-4 border-black p-8 pixel-shadow text-center">
            <h2 className="font-[family-name:var(--font-pixel)] text-2xl text-[#5b3a8f] mb-4">JOIN OUR COMMUNITY</h2>
            <p className="text-[#2c3e50] leading-relaxed mb-6">
              Connect with fellow pixel art enthusiasts, share your creations, and stay updated on new releases and
              exclusive drops.
            </p>
            <div className="flex justify-center gap-4">
              <button className="bg-[#5b3a8f] text-white px-6 py-3 border-4 border-black font-bold hover:bg-[#4a2f73] transition-colors pixel-shadow">
                DISCORD
              </button>
              <button className="bg-[#4ecdc4] text-black px-6 py-3 border-4 border-black font-bold hover:bg-[#3db8af] transition-colors pixel-shadow">
                TWITTER
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
