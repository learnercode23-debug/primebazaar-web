import Link from 'next/link'

export const metadata = { title: 'About PrimePasal' }

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">About PrimePasal</h1>
      <p className="text-gray-500 mb-8">Nepal's trusted online marketplace</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Who We Are</h2>
          <p>
            PrimePasal is a Nepal-based e-commerce marketplace connecting buyers and sellers
            across the country. We make it easy for customers to shop a wide range of products —
            from electronics and fashion to home goods and books — and for sellers to reach
            thousands of customers online.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h2>
          <p>
            Our mission is to make quality products accessible to every customer in Nepal while
            giving local sellers a powerful platform to grow their business online. We believe in
            fair pricing, fast delivery, and excellent customer support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Why Shop with Us?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Thousands of products from verified sellers across Nepal</li>
            <li>Secure payments via Khalti, eSewa, and Cash on Delivery</li>
            <li>Real-time order tracking from purchase to delivery</li>
            <li>Easy returns and dedicated customer support</li>
            <li>Exclusive daily deals and lightning offers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Sell on PrimePasal</h2>
          <p className="mb-3">
            Are you a business owner or individual seller? Join thousands of sellers already
            growing their business on PrimePasal. List your products, manage orders, and
            receive payments — all in one place.
          </p>
          <Link href="/register?role=seller"
            className="inline-block bg-amazon-yellow hover:bg-yellow-400 text-gray-900 font-bold px-6 py-2.5 rounded-full text-sm transition-colors">
            Start Selling Today
          </Link>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
          <p>
            Have a question or need help? Visit our{' '}
            <Link href="/support" className="text-amazon-teal hover:underline">Help Center</Link>{' '}
            or email us at{' '}
            <a href="mailto:pasalprime@gmail.com" className="text-amazon-teal hover:underline">
              pasalprime@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
