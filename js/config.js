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
    "images/heroes/benny-bed.jpg",
    "images/heroes/benny-yard.jpg",
    "images/heroes/leo-couch.jpg"
  ],

  // ─── Dog Profiles ───
  // Future: weight, meds, birthday, vet info
  dogs: [
    {
      name: "Benny",
      breed: "Dachshund",
      photos: [
        "images/heroes/benny-bed.jpg",
        "images/heroes/benny-yard.jpg"
      ]
      // birthday: "2023-01-01",
      // weight: { value: 12, unit: "lbs" },
      // meds: [],
      // vet: { name: "", phone: "", nextAppt: "" }
    },
    {
      name: "Leo",
      breed: "Goldendoodle",
      photos: [
        "images/heroes/leo-couch.jpg"
      ]
      // birthday: "2022-01-01",
      // weight: { value: 55, unit: "lbs" },
      // meds: [],
      // vet: { name: "", phone: "", nextAppt: "" }
    }
  ],

  // ─── Feature Flags ───
  // Toggle future features on/off
  features: {
    calendar: true,
    profiles: false,      // Dog profile pages
    activityLog: false,   // Walks, vet, grooming log
    expenses: false       // Expense tracking/splitting
  },

  // ─── App Meta ───
  version: "2.0.0",
  appName: "The Boyz",
  tagline: "Leo & Benny"
};

export default APP_CONFIG;
