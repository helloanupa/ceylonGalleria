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
  const scrollContainerRef = useRef(null);
  const slidesRef = useRef([]);

  // Set document title on mount
  useEffect(() => {
    document.title = "Ceylon Galleria | Home";
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const slides = slidesRef.current;

    const updateDots = (index) => setCurrentSlide(index);

    const goToSlide = (index) => {
      if (index < 0 || index >= slides.length) return;
      scrollContainer.scrollTo({
        top: slides[index].offsetTop,
        behavior: "smooth",
      });
      updateDots(index);
    };

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > 50) {
        e.preventDefault();
        if (e.deltaY > 0 && currentSlide < slides.length - 1) {
          goToSlide(currentSlide + 1);
        } else if (e.deltaY < 0 && currentSlide > 0) {
          goToSlide(currentSlide - 1);
        }
      }
    };

    const handleKey = (e) => {
      if (e.key === "ArrowDown" && currentSlide < slides.length - 1) {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      } else if (e.key === "ArrowUp" && currentSlide > 0) {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      }
    };

    const handleScroll = () => {
      const scrollPos = scrollContainer.scrollTop;
      for (let i = 0; i < slides.length; i++) {
        if (scrollPos < slides[i].offsetTop + slides[i].offsetHeight / 2) {
          if (currentSlide !== i) updateDots(i);
          break;
        }
      }
    };

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKey);
    scrollContainer.addEventListener("scroll", handleScroll);

    return () => {
      scrollContainer.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKey);
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [currentSlide]);

  return (
    <>
      <Header />

      <div
        className="h-screen overflow-y-scroll scroll-smooth scroll-snap-y-mandatory pt-20"
        ref={scrollContainerRef}
      >
        {/* Slide 1 */}
        <div
          ref={(el) => (slidesRef.current[0] = el)}
          className={`transition-all duration-700 ease-in-out ${
            currentSlide === 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <Slide
            title="MOUNTAIN IS MOUNTAIN 02"
            subtitle="14.5 × 17 cm · Mixed Media on Paper · 2025 · [ Now Showcasing ]"
            background={myArt}
            containerClass="h-screen flex items-end justify-start p-10 bg-cover bg-center scroll-snap-start transform transition-transform duration-700 ease-in-out hover:scale-105"
            titleClass="text-white text-4xl font-semibold uppercase tracking-widest mb-2 transition-opacity duration-700"
            subtitleClass="text-gray-200 text-lg font-light tracking-wide transition-opacity duration-700"
          />
        </div>

        {/* Slide 2 */}
        <div
          ref={(el) => (slidesRef.current[1] = el)}
          className={`transition-all duration-700 ease-in-out ${
            currentSlide === 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <Slide
            title="Please Don’t Let Big Die"
            subtitle="The struggle of Ceylon’s giants against human encroachment · Pigment Pen on Paper · 2025 · [ Now Showcasing ]"
            background={image2}
            containerClass="h-screen flex items-end justify-start p-10 bg-cover bg-center scroll-snap-start transform transition-transform duration-700 ease-in-out hover:scale-105"
            titleClass="text-white text-4xl font-semibold uppercase tracking-widest mb-2 transition-opacity duration-700"
            subtitleClass="text-gray-200 text-lg font-light tracking-wide transition-opacity duration-700"
          />
        </div>

        {/* News Section */}
        <div
          ref={(el) => (slidesRef.current[2] = el)}
          className={`transition-all duration-700 ease-in-out ${
            currentSlide === 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <NewsSection containerClass="scroll-snap-start bg-white p-12 sm:p-6" />
        </div>

      </div>

      {/* Dots Navigation */}
      <Dots
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

      <ScrollIndicator />

      <Footer />
    </>
  );
}

export default HomePage;
