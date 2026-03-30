import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="w-full bg-white shadow-sm z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo area */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  M
                </div>
                <span className="font-bold text-2xl text-gray-900 tracking-tight">MySurro</span>
              </Link>
            </div>

            {/* Desktop Navigation (Placeholder for future links) */}
            <nav className="hidden md:flex space-x-8">
              <Link href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Home
              </Link>
              <Link href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Find Programs
              </Link>
              <Link href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Surrogate Agencies
              </Link>
              <Link href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Contact Us
              </Link>
            </nav>

            {/* Login Button */}
            <div className="flex items-center">
              <Link 
                href="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors shadow-sm"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="relative bg-gray-900 h-[600px] flex items-center">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Using a placeholder image from Unsplash that fits the theme */}
            <img
              src="https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=2070&auto=format&fit=crop"
              alt="Family background"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/90"></div>
          </div>

          {/* Hero Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="text-center md:text-left md:w-2/3">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Connecting Families & <br />
                <span className="text-blue-400">Empowering Journeys</span>
              </h1>
              <p className="text-xl text-gray-200 mb-10 max-w-2xl">
                The premier platform for egg donors, intended parents, and IVF industry professionals to connect, manage, and grow together.
              </p>
            </div>

            {/* Action Cards */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              {/* Card 1 */}
              <div className="bg-white rounded-xl p-8 shadow-xl transform transition hover:-translate-y-1 hover:shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Egg Donors & Intended Parents</h2>
                <p className="text-gray-600 mb-6">
                  Find an Egg Donor Program or start your journey to becoming a parent.
                </p>
                <button className="text-blue-600 font-semibold flex items-center hover:text-blue-800">
                  Search Programs 
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl p-8 shadow-xl transform transition hover:-translate-y-1 hover:shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">IVF Industry Professionals</h2>
                <p className="text-gray-600 mb-6">
                  Interested in our software? Learn how we can help manage your agency.
                </p>
                <button className="text-blue-600 font-semibold flex items-center hover:text-blue-800">
                  Visit Software 
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for future sections */}
        <div className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Leading Agencies</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform provides the tools you need to deliver a first-class experience for your intended parents and donors.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-bold text-xl text-white">MySurro</span>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} MySurro, LLC. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0 text-sm text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Terms of Use</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
