import type { ShopId } from "./maatu-design";

// Scene names and goals, shared by the scenes screen and the public language
// pages so both always describe the same scenes. No em dashes anywhere.

export const SCENE_NAMES: Record<ShopId, string> = {
  auto: "A ride across town",
  cab: "Your cab has arrived",
  chai: "A little café conversation",
  market: "Buying vegetables",
  gate: "Your delivery is here",
  phone: "Call customer care",
  music: "Teach what you love",
  lesson: "Your music class",
  desk: "Ask Nathaniel School",
  airport: "Ready for takeoff",
  salon: "A haircut and a chat",
  kirana: "The grocery store",
  clinic: "At the clinic",
  hospital: "At the hospital",
  insurance: "Buying health insurance",
  claim: "Negotiate an insurance claim",
  restaurant: "Order something delicious",
  neighbour: "Meet the neighbours",
  landlord: "A repair at home",
  pharmacy: "At the pharmacy",
};

export const SCENE_TASKS: Partial<Record<ShopId, string[]>> = {
  auto: ["Say where you want to go", "Agree a fair fare", "Keep the small talk going"],
  cab: ["Say where you are standing", "Read out the OTP", "Agree the route and pay"],
  chai: ["Say hello", "Talk about your day", "Ask a question back"],
  market: ["Ask what is fresh", "Find out the price", "Bargain a little"],
  kirana: ["Read out your list", "Ask for another brand", "Settle the bill"],
  hospital: ["Say why you came", "Ask where to go", "Understand the floor and token"],
  insurance: ["Say who needs cover", "Ask what is included", "Push back on the price"],
  claim: ["Ask why money was cut", "Stay calm and firm", "Agree the next step"],
  lesson: ["Count four beats", "Name the notes", "Ask your teacher a question"],
  desk: ["Say what you want to learn", "Ask how classes work", "Find your next step"],
  music: ["Explain a simple idea", "Answer a curious question", "Help your student try it"],
};
