require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Problem = require('../src/models/Problem');
const User = require('../src/models/Users');

const dsaProblems = [
  {
    title: 'Watermelon',
    slug: 'watermelon',
    difficulty: 'easy',
    topic: 'Math',
    tags: ['math', 'brute force', 'implementation', 'codeforces'],
    timeLimit: 1000,
    memoryLimit: 256,
    description: `### Problem Description
One hot summer day Pete and his friend Billy decided to buy a watermelon. They chose the biggest and the ripest one, in their opinion. After that the watermelon was weighed, and the scales showed $w$ kilos. They rushed home, dying of thirst, and decided to divide the berry, however they faced a hard problem.

Pete and Billy are great fans of even numbers, that's why they want to divide the watermelon in such a way that each of the two parts weighs an **even number of kilos**, while it is not obligatory that the parts are equal in weight. The parts must be strictly positive integers.

They are quite exhausted and want to start their meal as soon as possible, that's why you should help them and find out if they can divide the watermelon into two parts in the way they want.

### Input Format
The first (and only) input line contains integer number $w$ ($1 \\le w \\le 100$) — the weight of the watermelon bought by the boys.

### Output Format
Print **\`YES\`**, if the boys can divide the watermelon into two parts, each weighing an even number of kilos; and **\`NO\`** in the opposite case.`,
    constraints: `1 <= w <= 100`,
    sampleTestCases: [
      {
        displayInput: '8',
        input: '8',
        output: 'YES',
        explanation: 'For example, the boys can divide the watermelon into two parts of 2 and 6 kilos (both numbers are even and positive).',
      },
    ],
    hiddenTestCases: [
      { input: '2', output: 'NO' },
      { input: '4', output: 'YES' },
      { input: '1', output: 'NO' },
      { input: '3', output: 'NO' },
      { input: '100', output: 'YES' },
      { input: '98', output: 'YES' },
      { input: '7', output: 'NO' },
      { input: '12', output: 'YES' },
    ],
  },
  {
    title: 'Way Too Long Words',
    slug: 'way-too-long-words',
    difficulty: 'easy',
    topic: 'Strings',
    tags: ['strings', 'implementation', 'codeforces'],
    timeLimit: 1000,
    memoryLimit: 256,
    description: `### Problem Description
Sometimes some words like \`localization\` or \`internationalization\` are so long that writing them many times in one text is quite tiresome.

Let's consider a word **too long**, if its length is **strictly more than 10 characters**. All too long words should be replaced with a special abbreviation.

This abbreviation is made like this: we write down the first and the last letter of a word and between them we write the number of letters between the first and the last letters. That number is in decimal system and doesn't contain any leading zeroes.

Thus, \`localization\` will be spelt as \`l10n\`, and \`internationalization\` will be spelt as \`i18n\`.

You are given $n$ words. Replace all words whose length is strictly greater than 10 with their abbreviation.

### Input Format
The first line contains an integer $n$ ($1 \\le n \\le 100$).
Each of the following $n$ lines contains one word. All the words consist of lowercase Latin letters and possess lengths of from 1 to 100 characters.

### Output Format
Print $n$ lines. The $i$-th line should contain the result of replacing the $i$-th word from the input data.`,
    constraints: `1 <= n <= 100\n1 <= length of word <= 100`,
    sampleTestCases: [
      {
        displayInput: '4\nword\nlocalization\ninternationalization\npneumonoultramicroscopicsilicovolcanoconiosis',
        input: '4\nword\nlocalization\ninternationalization\npneumonoultramicroscopicsilicovolcanoconiosis',
        output: 'word\nl10n\ni18n\np43s',
        explanation: 'word has length 4 (<= 10), unchanged. localization has 12 letters -> l10n. internationalization has 20 letters -> i18n.',
      },
    ],
    hiddenTestCases: [
      {
        input: '3\ncode\ncodeforces\nsupercalifragilisticexpialidocious',
        output: 'code\ncodeforces\ns32s',
      },
      {
        input: '2\na\nabcdefghij',
        output: 'a\nabcdefghij',
      },
      {
        input: '2\nabcdefghijk\nhelloworldprogram',
        output: 'a9k\nh15m',
      },
      {
        input: '1\nhippopotomonstrosesquippedaliophobia',
        output: 'h34a',
      },
    ],
  },
  {
    title: 'Next Round',
    slug: 'next-round',
    difficulty: 'easy',
    topic: 'Arrays',
    tags: ['arrays', 'implementation', 'codeforces'],
    timeLimit: 1000,
    memoryLimit: 256,
    description: `### Problem Description
"Contestant who earns a score equal to or greater than the $k$-th place finisher's score will advance to the next round, as long as the contestant earns a positive score..." — an excerpt from contest rules.

A total of $n$ participants took part in the contest ($n \\ge k$), and you already know their scores. Calculate how many participants will advance to the next round.

### Input Format
The first line of the input contains two integers $n$ and $k$ ($1 \\le k \\le n \\le 50$) separated by a single space.

The second line contains $n$ space-separated integers $a_1, a_2, \\dots, a_n$ ($0 \\le a_i \\le 100$), where $a_i$ is the score earned by the participant who got the $i$-th place. The given sequence is non-increasing (that is, for all $i$ from 1 to $n - 1$ the following condition is fulfilled: $a_i \\ge a_{i+1}$).

### Output Format
Output the number of participants who advance to the next round.`,
    constraints: `1 <= k <= n <= 50\n0 <= a_i <= 100\na_1 >= a_2 >= ... >= a_n`,
    sampleTestCases: [
      {
        displayInput: '8 5\n10 9 8 7 7 7 5 5',
        input: '8 5\n10 9 8 7 7 7 5 5',
        output: '6',
        explanation: 'The 5th place participant scored 7 points. Participants 1 to 6 all earned >= 7 points and strictly > 0, so 6 participants advance.',
      },
      {
        displayInput: '4 2\n0 0 0 0',
        input: '4 2\n0 0 0 0',
        output: '0',
        explanation: 'All participants scored 0 points. Because only positive scores (> 0) advance, nobody advances.',
      },
    ],
    hiddenTestCases: [
      { input: '5 1\n1 1 1 1 1', output: '5' },
      { input: '5 5\n5 4 3 2 1', output: '5' },
      { input: '3 2\n10 0 0', output: '1' },
      { input: '6 3\n5 4 3 0 0 0', output: '3' },
      { input: '1 1\n0', output: '0' },
      { input: '1 1\n42', output: '1' },
    ],
  },
  {
    title: 'Interesting Drink',
    slug: 'interesting-drink',
    difficulty: 'medium',
    topic: 'Binary Search',
    tags: ['binary-search', 'sorting', 'two-pointers', 'codeforces'],
    timeLimit: 2000,
    memoryLimit: 256,
    description: `### Problem Description
Vasiliy likes to rest after a hard work day, so he often goes to the local bar.

There are $n$ shops in the city that sell his favourite drink "Beecola". The price of a bottle in the $i$-th shop is equal to $x_i$ coins.

Vasiliy plans to buy the drink for each of the consecutive $q$ days. He knows that on the $j$-th day he will have $m_j$ coins. Vasiliy wants to know: for each of the days, **in how many different shops can he buy a bottle of "Beecola"**?

### Input Format
- The first line contains an integer $n$ ($1 \\le n \\le 100\\,000$) — the number of shops in the city.
- The second line contains $n$ integers $x_1, x_2, \\dots, x_n$ ($1 \\le x_i \\le 100\\,000$) — the price of a bottle in each shop.
- The third line contains an integer $q$ ($1 \\le q \\le 100\\,000$) — the number of days Vasiliy plans to buy the drink.
- The following $q$ lines each contain one integer $m_j$ ($1 \\le m_j \\le 10^9$) — the number of coins Vasiliy has on the $j$-th day.

### Output Format
Print $q$ integers. The $j$-th line should contain the number of shops where the price of a bottle is less than or equal to $m_j$.`,
    constraints: `1 <= n <= 100,000\n1 <= x_i <= 100,000\n1 <= q <= 100,000\n1 <= m_j <= 10^9`,
    sampleTestCases: [
      {
        displayInput: '5\n3 10 8 6 11\n4\n1\n10\n3\n11',
        input: '5\n3 10 8 6 11\n4\n1\n10\n3\n11',
        output: '0\n4\n1\n5',
        explanation: 'On day 1 with 1 coin: 0 shops afford. On day 2 with 10 coins: prices {3, 6, 8, 10} are <= 10 (4 shops). On day 3 with 3 coins: price 3 is <= 3 (1 shop). On day 4 with 11 coins: all 5 shops.',
      },
    ],
    hiddenTestCases: [
      {
        input: '3\n1 2 3\n3\n0\n2\n5',
        output: '0\n2\n3',
      },
      {
        input: '1\n5\n2\n4\n5',
        output: '0\n1',
      },
      {
        input: '4\n2 2 2 2\n3\n1\n2\n3',
        output: '0\n4\n4',
      },
      {
        input: '5\n10 20 30 40 50\n5\n5\n15\n25\n35\n55',
        output: '0\n1\n2\n3\n5',
      },
    ],
  },
  {
    title: 'Cut Ribbon',
    slug: 'cut-ribbon',
    difficulty: 'medium',
    topic: 'Dynamic Programming',
    tags: ['dp', 'brute force', 'math', 'codeforces'],
    timeLimit: 1000,
    memoryLimit: 256,
    description: `### Problem Description
Polycarpus has a ribbon, its length is $n$. He wants to cut the ribbon in a way that fulfills the following two conditions:
1. After the cutting, each ribbon piece must have length equal to $a$, $b$, or $c$.
2. The number of ribbon pieces obtained must be **maximum possible**.

Help Polycarpus and find the number of ribbon pieces after the optimal cutting.

### Input Format
The first and only line contains four space-separated integers $n, a, b, c$ ($1 \\le n, a, b, c \\le 4000$) — the length of the original ribbon and the acceptable piece lengths respectively. The numbers $a, b,$ and $c$ can be equal.

### Output Format
Print a single integer — the maximum possible number of ribbon pieces. It is guaranteed that at least one valid cutting exists.`,
    constraints: `1 <= n, a, b, c <= 4000`,
    sampleTestCases: [
      {
        displayInput: '5 5 3 2',
        input: '5 5 3 2',
        output: '2',
        explanation: 'The ribbon of length 5 can be cut into two pieces: length 2 and length 3 (2 + 3 = 5). Max pieces = 2.',
      },
      {
        displayInput: '7 5 5 2',
        input: '7 5 5 2',
        output: '2',
        explanation: 'Pieces of length 5 and 2 (5 + 2 = 7). Max pieces = 2.',
      },
    ],
    hiddenTestCases: [
      { input: '4 1 2 3', output: '4' },
      { input: '10 2 2 2', output: '5' },
      { input: '23 2 5 7', output: '10' },
      { input: '8 3 2 5', output: '4' },
      { input: '4000 1 2 3', output: '4000' },
    ],
  },
  {
    title: 'Maximum Subarray Sum',
    slug: 'maximum-subarray-sum',
    difficulty: 'medium',
    topic: 'Dynamic Programming',
    tags: ['dp', 'greedy', 'arrays', 'divide-and-conquer'],
    timeLimit: 1000,
    memoryLimit: 256,
    description: `### Problem Description
Given an array of $n$ integers, your task is to find the **maximum contiguous subarray sum**.
A subarray must contain at least one element.

### Input Format
The first input line has an integer $n$ ($1 \\le n \\le 200\\,000$): the size of the array.
The second line has $n$ integers $x_1, x_2, \\dots, x_n$ ($-10^9 \\le x_i \\le 10^9$): the array values.

### Output Format
Print one integer: the maximum subarray sum.`,
    constraints: `1 <= n <= 200,000\n-10^9 <= x_i <= 10^9`,
    sampleTestCases: [
      {
        displayInput: '8\n-2 1 -3 4 -1 2 1 -5 4',
        input: '8\n-2 1 -3 4 -1 2 1 -5 4',
        output: '6',
        explanation: 'The contiguous subarray [4, -1, 2, 1] gives the maximum sum = 4 + (-1) + 2 + 1 = 6.',
      },
    ],
    hiddenTestCases: [
      { input: '3\n-5 -2 -8', output: '-2' },
      { input: '1\n42', output: '42' },
      { input: '5\n1 2 3 4 5', output: '15' },
      { input: '4\n-1 -2 -3 -4', output: '-1' },
      { input: '6\n5 -4 3 2 -1 6', output: '11' },
    ],
  },
];

async function seedDSA() {
  console.log('🌱 Connecting to MongoDB Atlas to seed Codeforces-style DSA problems...');
  await connectDB();

  // Find admin user to assign createdBy
  const adminUser = (await User.findOne({ role: 'admin' })) || (await User.findOne());
  if (!adminUser) {
    throw new Error('No user found in database. Please ensure at least one user exists in the Users collection.');
  }
  console.log(`👤 Using user "${adminUser.name}" (${adminUser.email}) as creator.`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const prob of dsaProblems) {
    prob.createdBy = adminUser._id;

    const existing = await Problem.findOne({ slug: prob.slug });
    const result = await Problem.findOneAndUpdate(
      { slug: prob.slug },
      prob,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (existing) {
      updatedCount++;
      console.log(`🔄 Updated existing problem: [${prob.slug}] "${prob.title}" (${prob.difficulty})`);
    } else {
      insertedCount++;
      console.log(`✅ Seeded new problem: [${prob.slug}] "${prob.title}" (${prob.difficulty})`);
    }
  }

  console.log(`\n✨ Finished seeding DSA problems: ${insertedCount} created, ${updatedCount} updated.\n`);
  await mongoose.connection.close();
  process.exit(0);
}

seedDSA().catch((err) => {
  console.error('❌ DSA Seeding failed:', err.message);
  process.exit(1);
});
