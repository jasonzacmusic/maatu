import type { Lang, ShopId } from "./maatu-design";

// Situations make one scene feel different every visit. The label is what the
// learner taps; the brief is what the scene partner builds the scene around.
// A French brief replaces Indian details (rupees, UPI, autos) where needed.
export type Situation = { id: string; label: string; brief: string; fr?: string };

export const SITUATIONS: Record<ShopId, Situation[]> = {
  auto: [
    { id: "station", label: "Ride to the railway station", brief: "The passenger needs to reach the railway station in time for a train and is a little worried about the time." },
    { id: "meter", label: "He wants extra over the meter", brief: "The driver asks for 30 rupees over the meter because of the traffic. The passenger must politely negotiate." },
    { id: "wrong-turn", label: "He takes a wrong turn", brief: "Halfway through, the driver takes a wrong turn. The passenger must notice and give directions with left, right and a landmark." },
    { id: "upi", label: "UPI is not working", brief: "At the end the UPI payment fails. The passenger and driver sort out cash and change." },
  ],
  cab: [
    { id: "otp", label: "Find the cab and share the OTP", brief: "The driver cannot find the passenger at a busy pickup point. The passenger must describe where they are standing and read out the OTP." },
    { id: "cash", label: "Driver wants cash, not UPI", brief: "The driver says his UPI is not working and asks for cash only. The passenger must sort it out politely." },
    { id: "change-drop", label: "Change the drop point", brief: "Midway, the passenger wants to change the drop point to a nearby place and ask whether the fare will change." },
    { id: "ac", label: "Ask for the AC and a quick stop", brief: "It is hot. The passenger asks the driver to switch on the AC and to stop for two minutes at a shop on the way." },
  ],
  chai: [
    { id: "rain", label: "Rainy evening chat", brief: "It is raining. Easy small talk about the rain, traffic and something hot to drink." },
    { id: "cricket", label: "Yesterday's match", brief: "Chat about yesterday's cricket match: who played well, who did not." },
    { id: "weekend", label: "Weekend plans", brief: "Chat about what each of you is doing this weekend, food and family." },
    { id: "music", label: "Favourite songs", brief: "Chat about favourite songs, films and the music you grew up with.", fr: "Chat about favourite songs, films and the music you grew up with, at a Paris café." },
  ],
  market: [
    { id: "week", label: "A week of vegetables", brief: "The shopper buys vegetables for the week: onions, tomatoes, potatoes and beans, by the kilo." },
    { id: "bargain", label: "Bargain for tomatoes", brief: "Tomato prices went up this week. The shopper bargains politely for a better rate on two kilos." },
    { id: "fresh", label: "What is fresh today?", brief: "The shopper asks what is fresh and in season today and picks two things." },
    { id: "coriander", label: "Ask for free coriander", brief: "After buying, the shopper asks for a free bunch of coriander and curry leaves, the way regulars do.", fr: "After buying, the shopper asks the vendor for a free bunch of parsley, the way regulars do." },
  ],
  kirana: [
    { id: "monthly", label: "The monthly grocery list", brief: "The shopper reads out a monthly list: rice, dal, oil, sugar, tea powder and soap, with quantities." },
    { id: "brand", label: "Brand out of stock", brief: "The usual brand of oil or tea is out of stock. The shopper asks for another brand and the price difference." },
    { id: "delivery", label: "Ask for home delivery", brief: "The shopper asks for home delivery to their flat and gives the address and flat number." },
    { id: "book", label: "Put it on the monthly book", brief: "The shopper asks to add the bill to the monthly credit book and checks the running total." },
  ],
  restaurant: [
    { id: "breakfast", label: "Order breakfast", brief: "Order a simple breakfast and a coffee or tea, and ask what is ready right now." },
    { id: "spicy", label: "Not too spicy, please", brief: "The diner orders lunch and asks for less spice and no onion in one dish." },
    { id: "parcel", label: "Make it a parcel", brief: "The diner changes their mind and asks for part of the order to be packed as a parcel." },
    { id: "bill", label: "A mistake on the bill", brief: "The bill has one item the diner did not order. They point it out politely." },
  ],
  gate: [
    { id: "directions", label: "Guide the rider to your flat", brief: "The delivery rider is at the gate. Give clear directions: block, floor, lift, landmark." },
    { id: "wrong-item", label: "Wrong item delivered", brief: "One item in the order is wrong. Explain politely and ask what can be done." },
    { id: "otp", label: "Share the OTP", brief: "The rider needs the delivery OTP. Read it out digit by digit and confirm the order name." },
  ],
  neighbour: [
    { id: "new", label: "You just moved in", brief: "You just moved into the building. Introduce yourself, where you are from and what you do." },
    { id: "water", label: "Water and garbage timings", brief: "Ask the neighbour about the water supply timing and when the garbage van comes." },
    { id: "parcel", label: "Collect my parcel, please", brief: "Ask the neighbour to collect a parcel for you tomorrow while you are at work." },
  ],
  landlord: [
    { id: "tap", label: "A leaking tap", brief: "The kitchen tap is leaking. Explain the problem and agree a day for the plumber." },
    { id: "geyser", label: "The geyser stopped working", brief: "The geyser in the bathroom stopped working. Ask the landlord to fix it and discuss who pays." },
    { id: "rent", label: "Rent date and maintenance", brief: "Discuss the rent due date, a small maintenance increase and how to pay." },
  ],
  salon: [
    { id: "trim", label: "Just a trim", brief: "You want only a small trim, not too short at the sides." },
    { id: "new-style", label: "Try a new style", brief: "You want to try a new style for a wedding next week and ask for advice." },
    { id: "extras", label: "Say no to the extras", brief: "The barber offers a massage, a facial and a beard trim. Politely accept one and say no to the rest." },
  ],
  phone: [
    { id: "new", label: "Book a new connection", brief: "Book a new broadband connection: choose a plan, give the address and pick an installation slot." },
    { id: "complaint", label: "Internet down for two days", brief: "The internet has not worked for two days. Complain politely, give the account number and ask for a technician." },
    { id: "bill", label: "A wrong bill amount", brief: "This month's bill is higher than the plan. Ask why and request a correction." },
  ],
  airport: [
    { id: "bag", label: "Bag is overweight", brief: "The check-in bag is 3 kilos overweight. Negotiate politely or move items to the cabin bag." },
    { id: "seat", label: "Ask for a window seat", brief: "Ask for a window seat near the front and check the boarding time and gate." },
    { id: "gate", label: "The gate has changed", brief: "The gate has changed and boarding is soon. Ask the agent where to go and how long it takes." },
  ],
  clinic: [
    { id: "fever", label: "Fever and a cold", brief: "The patient has had a fever and a cold for three days and explains the symptoms." },
    { id: "stomach", label: "Stomach ache", brief: "The patient has a stomach ache since last night and answers the doctor's questions about food." },
    { id: "follow-up", label: "Follow-up visit", brief: "A follow-up visit: the patient reports feeling better and asks when to stop the tablets." },
  ],
  pharmacy: [
    { id: "prescription", label: "Buy medicines on a prescription", brief: "The customer has a prescription and asks for all the medicines and how to take them." },
    { id: "generic", label: "Ask for a cheaper generic", brief: "The customer asks if there is a cheaper generic version of a medicine." },
    { id: "headache", label: "Something for a headache", brief: "The customer asks for something for a headache. The pharmacist asks a few questions first." },
  ],
  hospital: [
    { id: "cardiology", label: "Find the cardiology department", brief: "The visitor has a cardiology appointment for their father and needs registration, the token number and the floor.", fr: "The visitor has a cardiologie appointment for their father and needs to check in and find the floor." },
    { id: "lab", label: "Book a blood test", brief: "The visitor needs a fasting blood test at the laboratory and asks when the report will be ready." },
    { id: "child", label: "My child needs a doctor", brief: "The visitor's child has a fever. They need the paediatrics department and ask how long the wait is." },
    { id: "xray", label: "Get an X-ray done", brief: "The doctor has asked for an X-ray of the knee. The visitor asks where radiology is and what to carry." },
    { id: "ward", label: "Visit a patient in the ward", brief: "The visitor wants to see a friend admitted yesterday. They ask for the ward, the room number and visiting hours." },
    { id: "billing", label: "Pay the bill, use insurance", brief: "The patient is being discharged. They ask where billing is and how the insurance cashless desk works.", fr: "The patient is going home. They ask where to settle the paperwork and how the mutuelle and carte Vitale are used." },
  ],
  insurance: [
    { id: "family", label: "Cover for my family", brief: "The customer wants health cover for themselves, their spouse and one child and compares two sums insured." },
    { id: "parents", label: "Cover for my parents", brief: "The customer wants cover for parents over 60 and asks about pre-existing conditions like diabetes and the waiting period." },
    { id: "cashless", label: "Which hospitals are cashless?", brief: "The customer asks how cashless treatment works and whether their nearby hospital is in the network.", fr: "The customer asks how third-party payment (tiers payant) works and which costs are covered." },
    { id: "cheaper", label: "Too expensive, any cheaper plan?", brief: "The customer finds the premium too high and negotiates for a cheaper plan or a discount." },
  ],
  claim: [
    { id: "partial", label: "Claim only partly approved", brief: "The hospital claim was only partly approved. The customer asks why and questions each deduction." },
    { id: "room-rent", label: "Room rent deduction", brief: "Money was cut because the hospital room cost more than the policy limit. The customer argues it was the only room available." },
    { id: "documents", label: "Missing documents", brief: "The claim is on hold because a pharmacy bill is missing. The customer asks exactly what to upload and by when." },
    { id: "escalate", label: "Ask to escalate", brief: "The customer is not happy with the answer and politely but firmly asks to escalate to the grievance team." },
  ],
  music: [
    { id: "beat", label: "Explain a steady beat", brief: "Teach the curious student what a steady beat is and how to count four beats." },
    { id: "scale", label: "Explain a scale", brief: "Teach the student what a scale is, using the G major scale: G A B C D E F# G." },
    { id: "practice", label: "Why practise every day?", brief: "The student asks why they must practise every day. Convince them with a simple reason." },
  ],
  lesson: [
    { id: "first", label: "My first piano lesson", brief: "The student's very first piano or keyboard lesson: sitting, finding notes, counting four beats." },
    { id: "rhythm", label: "Counting and clapping rhythm", brief: "A rhythm lesson: count one to four, clap on beat one, then clap a simple pattern." },
    { id: "scale", label: "The G major scale", brief: "Learn the G major scale, G A B C D E F# G, and why it has one sharp, F#." },
    { id: "guitar", label: "First guitar chords", brief: "A first guitar lesson: the G, C and D chords and changing between them slowly." },
    { id: "plan", label: "A practice plan for the week", brief: "The student asks how to practise at home this week: how many minutes, with a metronome, what to focus on." },
  ],
  desk: [
    { id: "beginner", label: "I am a complete beginner", brief: "An adult complete beginner asks which course to start with and how classes work." },
    { id: "child", label: "Lessons for my child", brief: "A parent asks about music lessons for their child and which instrument to start with." },
    { id: "abroad", label: "Learning online from abroad", brief: "Someone living outside India asks whether they can learn online and how the class times work." },
    { id: "missed", label: "I missed a class", brief: "A current student missed a class and asks how to catch up, recordings and homework." },
    { id: "free", label: "Can I try something free first?", brief: "Someone asks if there is a trial class. Explain the free lessons, the free workshop and the free practice apps." },
  ],
};

export function situationBrief(situation: Situation, lang: Lang) {
  return lang === "fr" && situation.fr ? situation.fr : situation.brief;
}
