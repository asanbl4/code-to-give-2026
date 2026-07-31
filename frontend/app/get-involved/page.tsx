import React from 'react';

export default function GetInvolvedPage() {
  return (
    // manually forcing a light background to ensure proper contrast
    <div className="w-full min-h-screen bg-slate-100 text-slate-800">
      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <section className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-emerald-600 mb-4 tracking-tight">
            Get Involved with Love 21
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto">
            Empowering the Down syndrome and autism community in Hong Kong through sports, 
            nutrition, and holistic support. Join us in making a lasting impact!
          </p>
        </section>

        {/* Main 3 Feature Sections */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 1. Donate Section */}
          <section className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
            <div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-2xl mb-6">
                ❤️
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Make a Donation</h2>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Your financial contributions directly fund our sports classes, nutritional guidance programs, and counseling for our community members and their families.
              </p>
            </div>
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm">
              Donate Now
            </button>
          </section>

          {/* 2. Donate Wishlist Section */}
          <section className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
            <div>
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold text-2xl mb-6">
                🎁
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Donation Wishlist</h2>
              <p className="text-slate-700 mb-4 leading-relaxed">
                Prefer to give essential supplies? Check out our active wishlist of needed equipment and items:
              </p>
              <ul className="text-sm text-slate-700 space-y-2 mb-6 list-disc list-inside">
                <li>Sports Equipment (Basketballs, Yoga mats)</li>
                <li>Nutritional ingredients & snacks</li>
                <li>Art & workshop craft supplies</li>
              </ul>
            </div>
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm">
              View Item Wishlist
            </button>
          </section>

          {/* 3. Volunteer Section */}
          <section className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col justify-between hover:scale-105 transition-transform duration-300">
            <div>
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center font-bold text-2xl mb-6">
                🤝
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Become a Volunteer</h2>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Share your time and skills! Help coach sports activities, assist in nutrition classes, or support our community events and administration.
              </p>
            </div>
            <button className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm">
              Sign Up to Volunteer
            </button>
          </section>

        </div>
      </main>
    </div>
  );
}