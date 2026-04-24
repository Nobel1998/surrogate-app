import Link from 'next/link';

const HOMEPAGE_SCREENSHOTS = [
  {
    src: '/screenshots/01-login.png',
    alt: 'MySurro sign-in screen with email and password fields',
  },
  {
    src: '/screenshots/02-my-journey.png',
    alt: 'MySurro My Journey screen showing surrogacy progress and milestones',
  },
  {
    src: '/screenshots/03-my-match-documents.png',
    alt: 'MySurro My Match screen with documents and records list',
  },
  {
    src: '/screenshots/04-blogs.png',
    alt: 'MySurro Blogs feed with news and community updates',
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="w-full bg-white shadow-sm z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo area */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-3">
                <img
                  src="/mysurro-logo.png"
                  alt="MySurro"
                  width={44}
                  height={44}
                  className="w-11 h-11 object-contain"
                  loading="eager"
                />
                <span className="font-bold text-2xl text-gray-900 tracking-tight">MySurro</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#home" className="text-gray-600 hover:text-rose-400 font-medium transition-colors">
                Home
              </a>
              <a href="#features" className="text-gray-600 hover:text-rose-400 font-medium transition-colors">
                Features
              </a>
              <a href="#download" className="text-gray-600 hover:text-rose-400 font-medium transition-colors">
                Download
              </a>
              <a href="https://babytreesurrogacy.com/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-rose-400 font-medium transition-colors">
                Babytree Surrogacy
              </a>
            </nav>

            {/* Login Button */}
            <div className="flex items-center">
              <Link 
                href="/login" 
                className="bg-rose-400 hover:bg-rose-500 text-white px-6 py-2.5 rounded-md font-medium transition-colors shadow-sm"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div id="home" className="relative bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-20">
              <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                <div className="sm:text-center lg:text-left">
                  <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                    <span className="block xl:inline">MySurro: The First</span>{' '}
                    <span className="block text-rose-400">3-Way Surrogacy App</span>
                  </h1>
                  <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                    Developed by Babytree Surrogacy. Seamlessly connecting Intended Parents, Surrogates, and Agency Coordinators in real-time. A new surrogacy experience, everything is under control.
                  </p>
                  <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                    <div className="rounded-md shadow">
                      <a
                        href="#download"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-rose-400 hover:bg-rose-500 md:py-4 md:text-lg md:px-10"
                      >
                        Download App
                      </a>
                    </div>
                    <div className="mt-3 sm:mt-0 sm:ml-3">
                      <a
                        href="https://babytreesurrogacy.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-rose-700 bg-rose-100 hover:bg-rose-200 md:py-4 md:text-lg md:px-10"
                      >
                        Visit Babytree
                      </a>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-rose-50 flex items-center justify-center p-12">
            {/* Phone Mockup Placeholder */}
            <div className="relative w-64 h-[500px] bg-gray-900 rounded-[3rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden flex items-center justify-center">
              <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl w-1/2 mx-auto z-20"></div>
              <div className="text-center text-gray-500 px-4">
            <div className="w-16 h-16 mx-auto bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
              <img
                src="/mysurro-logo.png"
                alt="MySurro logo"
                width={56}
                height={56}
                className="w-14 h-14 object-contain"
                loading="eager"
              />
            </div>
                <p className="font-medium text-gray-400">MySurro App Interface</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                A Practical Real-Time APP for Surrogacy
              </h2>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                We believe that the communication between surrogate mothers and intended parents should always be open, transparent, timely, detailed and direct.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-lg flex items-center justify-center mb-4 text-xl">
                  📝
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Easy Registration Forms</h3>
                <p className="text-gray-600">
                  Makes it easy for surrogates and intended parents to complete registration forms online and simplify onboarding.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 text-xl">
                  ⏱️
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Real-Time Progress Updates</h3>
                <p className="text-gray-600">
                  Provides timely updates across the full journey, so intended parents can track progress directly without waiting for manual agency updates.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 text-xl">
                  🔔
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Appointment Reminders</h3>
                <p className="text-gray-600">
                  Smart reminder alerts help everyone stay on schedule and never miss key medical checkups or legal milestones.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4 text-xl">
                  📈
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Surrogate Progress Log</h3>
                <p className="text-gray-600">
                  Helps surrogates conveniently record their IVF process and pregnancy progress at any time.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4 text-xl">
                  📁
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">One-Stop Document Hub</h3>
                <p className="text-gray-600">
                  Gives intended parents and surrogates one secure place to store all files and medical documents.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center mb-4 text-xl">
                  🔍
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Search Surrogate Database</h3>
                <p className="text-gray-600">
                  Allows intended parents to easily search and review the surrogate database to find the best match.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshots Section */}
        <div className="py-20 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-gray-900">
                Inside MySurro
              </h2>
              <p className="mt-4 text-xl text-gray-500">
                A glimpse into the first 3-way surrogacy communication platform.
              </p>
            </div>
            
            {/* Horizontal scrolling container for screenshots */}
            <div className="flex space-x-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
              {HOMEPAGE_SCREENSHOTS.map((shot, index) => (
                <div
                  key={shot.src}
                  className="snap-center shrink-0 w-64 h-[500px] bg-gray-100 rounded-[2.5rem] border-[6px] border-gray-200 shadow-lg relative overflow-hidden"
                >
                  <div className="pointer-events-none absolute top-0 inset-x-0 z-20 mx-auto h-5 w-1/2 rounded-b-2xl bg-gray-200" />
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    className="absolute inset-0 z-0 h-full w-full object-cover object-top"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Download Section */}
        <div id="download" className="py-20 bg-rose-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl mb-8">
              Ready to start your journey?
            </h2>
            <div className="flex flex-col md:flex-row justify-center items-center gap-12">
              {/* iOS Download */}
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center w-72">
                <div className="w-40 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-gray-400 text-sm">iOS QR Code</span>
                </div>
                <button className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-1.226 1.76-2.505 3.51-4.458 3.51-1.894 0-2.522-1.15-4.67-1.15-2.147 0-2.844 1.12-4.613 1.15-1.948.03-3.41-1.96-4.646-3.75C3.333 16.11 1.5 11.23 1.5 8.09c0-3.3 2.055-5.06 3.99-5.06 1.83 0 3.22 1.25 4.5 1.25 1.225 0 2.92-1.34 5.06-1.34 1.74 0 3.32.68 4.4 1.94-3.66 1.96-3.08 6.94.71 8.52-.16.45-.33.91-.53 1.34z"/></svg>
                  App Store
                </button>
              </div>

              {/* Android Download */}
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center w-72">
                <div className="w-40 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center mb-6">
                  <span className="text-gray-400 text-sm">Android QR Code</span>
                </div>
                <button className="w-full bg-green-600 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.4162.4162 0 00-.5676.1521l-2.0218 3.503C15.5902 8.244 13.8533 7.851 12 7.851c-1.8533 0-3.5902.393-5.1373 1.0997L4.841 5.4477a.4162.4162 0 00-.5676-.1521.4159.4159 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/></svg>
                  Google Play
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <img
              src="/mysurro-logo.png"
              alt="MySurro"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              loading="eager"
            />
            <span className="font-bold text-xl text-white">MySurro</span>
          </div>
          <div className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Babytree Surrogacy. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0 text-sm text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Terms of Use</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <a href="https://babytreesurrogacy.com/contact-us/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
