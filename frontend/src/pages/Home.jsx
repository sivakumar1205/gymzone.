import { useMemo } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import StoreLayout from '../components/StoreLayout.jsx';
import { useStore } from '../context/StoreContext.jsx';

const categories = [
  { name: 'GYM EQUIPMENT', detail: 'Built to go harder.', image: '1954524', target: '#equipment' },
  { name: 'ACCESSORIES', detail: 'The details matter.', image: '3837781', target: '#trending' },
  { name: 'SUPPLEMENTS', detail: 'Fuel your next set.', image: '416717', target: '#supplements' },
  { name: 'GYM CLOTHING', detail: 'Made for movement.', image: '3823039', target: '#new-arrivals' },
  { name: 'HOME GYM', detail: 'Your space. Your pace.', image: '136405', target: '#offers' },
];

const reviews = [
  { quote: 'The dumbbells feel genuinely commercial-grade. My home setup finally feels like a real gym.', name: 'Marcus T.', detail: 'Verified customer · Strength training' },
  { quote: 'Thoughtful quality, fast delivery, and no guesswork. GYMZONE gets what training people actually need.', name: 'Priya K.', detail: 'Verified customer · 3 orders' },
  { quote: 'The perfect starter kit to build a proper routine at home. Already recommending it to my training partner.', name: 'Daniel R.', detail: 'Verified customer · Home gym' },
];

function ProductSection({ id, eyebrow, title, description, products, onAdd, linkText = 'SHOP ALL' }) {
  return (
    <section className="store-section content-width" id={id}>
      <SectionHeading eyebrow={eyebrow} title={title} description={description} linkText={linkText} />
      <div className="product-grid">
        {products.map((product) => <ProductCard key={product.id} product={product} onAdd={() => onAdd(product.id)} />)}
      </div>
    </section>
  );
}

function Home() {
  const { search, addToCart, products } = useStore();
  const productsById = Object.fromEntries(products.map((product) => [product.id, product]));
  const trendingProducts = ['ironcore-adjustable-dumbbells', 'kinetic-performance-tee', 'grippro-training-gloves', 'forge-competition-kettlebell'].map((id) => productsById[id]).filter(Boolean);
  const equipmentProducts = ['apex-olympic-barbell', 'ironcore-adjustable-dumbbells', 'foundation-folding-bench', 'ironcore-weight-plate-set'].map((id) => productsById[id]).filter(Boolean);
  const supplementProducts = ['whey-isolate-vanilla', 'daily-creatine-monohydrate', 'pre-workout-citrus-charge', 'stride-hydration-electrolyte-blend'].map((id) => productsById[id]).filter(Boolean);
  const newProducts = ['kinetic-performance-tee', 'stride-folding-treadmill', 'stride-resistance-band-set', 'stride-shaker-bottle'].map((id) => productsById[id]).filter(Boolean);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? products.filter((product) => `${product.name} ${product.category} ${product.brand}`.toLowerCase().includes(query)) : null;
  }, [search, products]);
  return (
    <StoreLayout>
      <main>
        {visibleProducts ? (
          <section className="search-results content-width">
            <SectionHeading eyebrow="FIND YOUR NEXT FAVOURITE" title={`RESULTS FOR “${search.trim()}”`} />
            {visibleProducts.length ? (
              <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={() => addToCart(product.id)} />)}</div>
            ) : <p className="empty-search">No products match that search. Try “dumbbells”, “tee”, or “whey”.</p>}
          </section>
        ) : (
          <>
            <section className="hero">
              <img className="hero-image" src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=78" alt="Athlete preparing to lift a barbell in a gym" fetchPriority="high" decoding="async" />
              <div className="hero-shade" />
              <div className="hero-content">
                <p className="hero-eyebrow"><span /> EQUIPMENT FOR EVERY REP</p>
                <h1>TRAIN HARD.<br /><span>SHOP SMART.</span></h1>
                <p className="hero-subtitle">Everything you need to build your stronger self.</p>
                <div className="hero-actions">
                  <a className="button button-orange" href="#equipment">SHOP NOW <ArrowRight size={17} /></a>
                  <a className="button button-outline" href="#trending">EXPLORE PRODUCTS</a>
                </div>
              </div>
              <div className="hero-index"><span>01</span> / BUILT FOR THE WORK</div>
              <a className="hero-scroll" href="#categories">SCROLL TO EXPLORE <span /></a>
            </section>

            <section className="category-section content-width" id="categories">
              <SectionHeading eyebrow="FIND YOUR EDGE" title="GEAR UP. GET AFTER IT." description="Everything for your training, in one place." />
              <div className="category-grid">
                {categories.map((category, index) => (
                  <a className={`category-card category-card-${index + 1}`} href={category.target} key={category.name}>
                    <img src={`https://images.pexels.com/photos/${category.image}/pexels-photo-${category.image}.jpeg?auto=compress&cs=tinysrgb&w=850`} alt="" loading="lazy" />
                    <span className="category-number">0{index + 1} / 05</span>
                    <span className="category-copy"><span>{category.detail}</span><strong>{category.name}</strong></span>
                    <span className="category-arrow"><ArrowRight size={19} /></span>
                  </a>
                ))}
              </div>
            </section>

            <ProductSection id="trending" eyebrow="WHAT THE GYM'S TALKING ABOUT" title="TRENDING RIGHT NOW" description="The gear showing up in everyone's training rotation." products={trendingProducts} onAdd={addToCart} />
            <ProductSection id="equipment" eyebrow="BUILT FOR THE LONG RUN" title="BEST-SELLING EQUIPMENT" description="Hard-wearing essentials. Zero excuses." products={equipmentProducts} onAdd={addToCart} />

            <section className="kit-banner content-width" id="offers">
              <div className="kit-image-wrap"><img src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Strength training equipment ready for a workout" loading="lazy" /></div>
              <div className="kit-copy">
                <p className="section-eyebrow">YOUR FIRST SETUP, SORTED</p>
                <h2>THE<br /><span>STARTING</span><br />LINE KIT.</h2>
                <p>Everything you need to build a solid home routine: a training bench, adjustable resistance, and the essentials to get moving.</p>
                <div className="kit-price"><strong>$219</strong><del>$286</del><span>SAVE 23%</span></div>
                <a className="button button-orange" href="#equipment">SHOP THE STARTER KIT <ArrowRight size={17} /></a>
              </div>
              <span className="kit-stamp">START<br />STRONG</span>
            </section>

            <ProductSection id="supplements" eyebrow="SMART FUEL. REAL SIMPLE." title="SUPPORT YOUR NEXT SET" description="Straightforward daily essentials for your training routine." products={supplementProducts} onAdd={addToCart} linkText="SHOP SUPPLEMENTS" />

            <section className="membership">
              <div className="membership-inner content-width">
                <div><p className="section-eyebrow">MORE REPS. MORE REWARDS.</p><h2>GOOD TRAINING<br /><span>SHOULD PAY OFF.</span></h2></div>
                <div className="membership-info"><p>Join GYMZONE CLUB for member-only drops, early access to new gear, and 10% off your first order.</p><a className="button button-orange" href="#footer">JOIN THE CLUB <ArrowRight size={17} /></a></div>
              </div>
            </section>

            <ProductSection id="new-arrivals" eyebrow="FRESH OFF THE RACK" title="NEW IN THE ZONE" description="New kit. Same commitment to the work." products={newProducts} onAdd={addToCart} linkText="VIEW ALL NEW" />

            <section className="brands content-width">
              <p className="section-eyebrow">GOOD COMPANY FOR YOUR TRAINING</p>
              <div className="brand-list" aria-label="Featured brands"><span>IRONCLAD</span><span className="brand-kinetic">KINETIC<span>®</span></span><span>FORGE<span className="brand-dot">.</span></span><span className="brand-apex">APEX / ATHLETICS</span><span>STRIDE</span></div>
            </section>

            <section className="reviews content-width">
              <SectionHeading eyebrow="REAL PEOPLE. REAL PROGRESS." title="THE WORK SPEAKS." description="A few words from the people putting their GYMZONE gear to work." />
              <div className="review-grid">{reviews.map((review) => (
                <article className="review-card" key={review.name}>
                  <div className="review-stars" aria-label="5 out of 5 stars"><Star /><Star /><Star /><Star /><Star /></div>
                  <blockquote>“{review.quote}”</blockquote>
                  <div className="review-person"><span className="review-avatar">{review.name.slice(0, 1)}</span><div><strong>{review.name}</strong><span>{review.detail}</span></div></div>
                </article>
              ))}</div>
            </section>
          </>
        )}
      </main>
    </StoreLayout>
  );
}

export default Home;
