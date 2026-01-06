/**
 * List of words used for generating random room IDs.
 */
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
    "silver", "gold", "beige", "brown", "grey", "black", "white",
    "moon", "sun", "star", "planet", "comet", "meteor", "galaxy", "nebula",
    "ocean", "river", "mountain", "forest", "desert", "valley", "canyon", "island",
    "cloud", "rain", "snow", "storm", "wind", "breeze", "thunder", "lightning",
    "coffee", "tea", "cookie", "cake", "pie", "bread", "toast", "jam",
    "book", "pen", "pencil", "paper", "desk", "chair", "lamp", "clock",
    "music", "song", "dance", "art", "paint", "draw", "sketch", "color"
];

/**
 * Generates a random room ID in the format 'WordWordWord1234'.
 * @returns A randomly generated room ID
 */
export function generateRandomId(): string {
    const getRandomWord = () => {
        const word = words[Math.floor(Math.random() * words.length)];
        return word.charAt(0).toUpperCase() + word.slice(1);
    };
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${getRandomWord()}${getRandomWord()}${getRandomWord()}${randomNumber}`;
}
