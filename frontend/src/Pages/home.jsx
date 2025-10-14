import React, { useEffect, useState, useRef } from "react";
import Header from "../components/Header";
import Slide from "../components/Slide";
import NewsSection from "../components/NewsSection";
import Footer from "../components/Footer";
import Dots from "../components/Dots";
import ScrollIndicator from "../components/ScrollIndicator";
import "../index.css";
import myArt from "../assets/image1.jpg";
import image2 from "../assets/image2.jpg";

function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const scrollContainerRef = useRef(null);
  const slidesRef = useRef([]);
  const contentSlidesCount = 3; // Number of slides with dots

  // Set document title
  useEffect(() => {
    document.title = "Ceylon Galleria | Home";
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const slides = slidesRef.current;
    const navigableSlides = slides.slice(0, contentSlidesCount);

    const updateDots = (index) => setCurrentSlide(index);

    const goToSlide = (index) => {
      if (index < 0 || index >= navigableSlides.length) return;
      scrollContainer.scroll({
        top: slides[index].offsetTop,
        behavior: "smooth",
      });
      updateDots(index);
    };

    const handleKey = (e) => {
      if (e.key === "ArrowDown" && currentSlide < navigableSlides.length - 1) {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      } else if (e.key === "ArrowUp" && currentSlide > 0) {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      }
    };

    const handleScroll = () => {
      const scrollPos = scrollContainer.scrollTop;
      if (scrollPos > 10 && !hasScrolled) setHasScrolled(true);
      for (let i = 0; i < navigableSlides.length; i++) {
        if (scrollPos < slides[i].offsetTop + slides[i].offsetHeight / 2) {
          if (currentSlide !== i) updateDots(i);
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    scrollContainer.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("keydown", handleKey);
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [currentSlide, hasScrolled, contentSlidesCount]);

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <Header />

      <div
        className="h-screen overflow-y-scroll overflow-x-hidden scroll-smooth scroll-snap-y-mandatory pt-20 no-scrollbar"
        ref={scrollContainerRef}
      >
        {/* Slide 1 */}
        <div
          ref={(el) => (slidesRef.current[0] = el)}
          className={`h-screen w-full overflow-hidden transition-opacity duration-700 ease-in-out ${
            currentSlide === 0 ? "opacity-100" : "opacity-50"
          }`}
        >
          <Slide
            title="MOUNTAIN IS MOUNTAIN 02"
            subtitle="14.5 × 17 cm · Mixed Media on Paper · 2025 · [ Now Showcasing ]"
            background={myArt}
            containerClass="h-full w-full flex items-end justify-start p-12 bg-cover bg-center scroll-snap-start transform transition-transform duration-700 ease-in-out hover:scale-105"
            titleClass="text-white text-4xl font-semibold uppercase tracking-widest mb-2 [text-shadow:1px_1px_4px_rgba(0,0,0,0.6)]"
            subtitleClass="text-gray-200 text-lg font-light tracking-wide [text-shadow:1px_1px_3px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* Slide 2 */}
        <div
          ref={(el) => (slidesRef.current[1] = el)}
          className={`h-screen w-full overflow-hidden transition-opacity duration-700 ease-in-out ${
            currentSlide === 1 ? "opacity-100" : "opacity-50"
          }`}
        >
          <Slide
            title="Please Don’t Let Big Die"
            subtitle="The struggle of Ceylon’s giants against human encroachment · Pigment Pen on Paper · 2025 · [ Now Showcasing ]"
            background={image2}
            containerClass="h-full w-full flex items-end justify-start p-12 bg-cover bg-center scroll-snap-start transform transition-transform duration-700 ease-in-out hover:scale-105"
            titleClass="text-white text-4xl font-semibold uppercase tracking-widest mb-2 [text-shadow:1px_1px_4px_rgba(0,0,0,0.6)]"
            subtitleClass="text-gray-200 text-lg font-light tracking-wide [text-shadow:1px_1px_3px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* News Section — tightened bottom space */}
        <div
          ref={(el) => (slidesRef.current[2] = el)}
          className={`w-full overflow-hidden transition-opacity duration-700 ease-in-out ${
            currentSlide === 2 ? "opacity-100" : "opacity-50"
          }`}
        >
          <NewsSection containerClass="scroll-snap-start bg-white pt-12 pb-12 sm:p-6" />
        </div>

        {/* Footer — no extra gap */}
        <div
          ref={(el) => (slidesRef.current[3] = el)}
          className="w-full scroll-snap-start bg-white"
        >
          <Footer />
        </div>
      </div>

      {/* Dots Navigation */}
      <Dots
        count={contentSlidesCount}
        current={currentSlide}
        setSlide={(i) => {
          const slides = slidesRef.current;
          const scrollContainer = scrollContainerRef.current;
          scrollContainer.scrollTo({
            top: slides[i].offsetTop,
            behavior: "smooth",
          });
          setCurrentSlide(i);
        }}
        className="transition-colors duration-500 ease-in-out"
      />

      {!hasScrolled && <ScrollIndicator />}
    </>
  );
}

export default HomePage;
