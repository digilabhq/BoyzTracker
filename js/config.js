/*
 * ══════════════════════════════════════
 *  THE BOYZ — App Configuration
 *  Edit this file to customize the app
 * ══════════════════════════════════════
 */

const APP_CONFIG = {

  // ─── Firebase ───
  firebase: {
    apiKey: "AIzaSyDY_ofRqn3MfOp8JCjZJGMf0tnAXGm0n0w",
    authDomain: "boyz-tracker.firebaseapp.com",
    projectId: "boyz-tracker",
    storageBucket: "boyz-tracker.firebasestorage.app",
    messagingSenderId: "175262311178",
    appId: "1:175262311178:web:327752d3aa280aa1ae10f3",
    measurementId: "G-6BXEFT94FX"
  },

  // ─── User PINs (4 digits → user id) ───
  pins: {
    "1869": "rp",
    "2023": "vr"
  },

  // ─── User Display Names ───
  users: {
    rp: { name: "RP", color: "blue",   paw: "images/icons/paw-blue.png" },
    vr: { name: "VR", color: "purple", paw: "images/icons/paw-purple.png" }
  },

  // ─── Hero Images (rotate on each visit) ───
  // Add new photos: drop image in images/heroes/ and add filename here
  heroImages: [
    "images/heroes/boyz-deck.png",
    "images/heroes/boyz-park.jpg",
	"images/heroes/boyz-looking.jpg",
	"images/heroes/boyz-golf.jpg",
    "images/heroes/benny-bed.jpg",
    "images/heroes/benny-yard.jpg",
	"images/heroes/benny-couch.jpg",
	"images/heroes/benny-baby.jpg",
	"images/heroes/benny-sun.jpg",
	"images/heroes/benny-posing.jpg",
	"images/heroes/benny-leafs.jpg",
	"images/heroes/benny-head.jpg",
	"images/heroes/benny-eyes.jpg",
	"images/heroes/leo-baby.jpg",
	"images/heroes/leo-glasses.jpg",
	"images/heroes/leo-teacher.jpg",
	"images/heroes/leo-sun.jpg",
	"images/heroes/leo-leaf.jpg",
	"images/heroes/leo-hat.jpg",
	"images/heroes/leo-fast.jpg",
	"images/heroes/leo-cigar.jpg",
	"images/heroes/leo-birthday.jpg",
	"images/heroes/leo-afro.jpg",
	"images/heroes/leo-couch.jpg"
  ],

  // ─── Dog Profiles (future) ───
  // birthday: "YYYY-MM-DD" — ⚠️ PLACEHOLDERS, set the real dates!
  dogs: [
    { name: "Benny", breed: "Dachshund",   birthday: "2020-01-01" },
    { name: "Leo",   breed: "Goldendoodle", birthday: "2021-01-01" }
  ],

  // ─── Feature Flags ───
  features: {
    calendar: true,
    profiles: false,
    activityLog: false,
    expenses: false
  },

  // ─── App Meta ───
  version: "2.3.0",
  appName: "The Boyz",
  tagline: "Leo & Benny"
};

export default APP_CONFIG;
