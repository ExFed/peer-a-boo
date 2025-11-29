export const words = [
  "apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew",
  "kiwi", "lemon", "mango", "nectarine", "orange", "papaya", "quince", "raspberry",
  "strawberry", "tangerine", "ugli", "vanilla", "watermelon", "xigua", "yuzu", "zucchini",
  "ant", "bear", "cat", "dog", "elephant", "fox", "giraffe", "hippo", "iguana",
  "jellyfish", "kangaroo", "lion", "monkey", "newt", "owl", "panda", "quail",
  "rabbit", "snake", "tiger", "urchin", "vulture", "wolf", "xenops", "yak", "zebra",
  "happy", "brave", "calm", "daring", "eager", "fancy", "gentle", "jolly",
  "kind", "lively", "merry", "nice", "polite", "quiet", "silly", "witty", "zany",
  "red", "orange", "yellow", "green", "blue", "indigo", "violet", "purple", "pink",
  "silver", "gold", "beige", "brown", "grey", "black", "white"
];

export function generateRandomId(): string {
  const getRandomWord = () => words[Math.floor(Math.random() * words.length)];
  return `${getRandomWord()}-${getRandomWord()}-${getRandomWord()}`;
}
