---
description: Generate a TDD practice challenge with boilerplate test setup
argument-hint: (no arguments - interactive)
_hint: Practice kata
_category: Utilities
_order: 10
_requested-tools:
  - WebFetch(domain:raw.githubusercontent.com)
  - WebFetch(domain:api.github.com)
---

# Kata: TDD Practice Challenge Generator

Generate a complete TDD practice setup:
- `CHALLENGE.md` - Problem description
- Test file with first test placeholder
- Implementation file with empty function

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/no-plan-files.md' featureFlag='no-plan-files' -->
<!-- /docs -->

## Input

$ARGUMENTS

(This command is interactive - arguments are ignored)

## Data Source

Exercises from [cyber-dojo](https://github.com/cyber-dojo/exercises-start-points) (60 exercises, stable 10+ years).

- **List:** `https://api.github.com/repos/cyber-dojo/exercises-start-points/contents/start-points`
- **Fetch:** `https://raw.githubusercontent.com/cyber-dojo/exercises-start-points/master/start-points/{NAME}/readme.txt`

## Kata Categories

<kata_categories>
<by_difficulty>
  <beginner description="Simple logic, single function">
    Fizz_Buzz, Leap_Years, Prime_Factors, Word_Wrap, Closest_To_Zero,
    Remove_Duplicates, Array_Shuffle, Friday_13th, Five_Weekends,
    Number_Names, Print_Diamond, LCD_Digits, Fisher_Yates_Shuffle
  </beginner>
  <intermediate description="Multiple rules, edge cases">
    Roman_Numerals, Reverse_Roman, Bowling_Game, Tennis, Anagrams,
    ISBN, Balanced_Parentheses, Calc_Stats, Recently_Used_List,
    Phone_Numbers, Combined_Number, Group_Neighbours, Longest_Common_Prefix,
    Yatzy, Yatzy_Cutdown, Harry_Potter, Vending_Machine, Count_Coins,
    100_doors, Haiku_Review, ABC_Problem, Align_Columns, Best_Shuffle,
    Filename_Range, Unsplice, 12_Days_of_Xmas
  </intermediate>
  <advanced description="Complex algorithms, state management">
    Game_of_Life, Mars_Rover, Mine_Sweeper, Mine_Field, Eight_Queens,
    Knights_Tour, Reversi, Poker_Hands, Levenshtein_Distance,
    Magic_Square, Saddle_Points, Tiny_Maze, Gray_Code, Monty_Hall,
    Number_Chains, Wonderland_Number, Zeckendorf_Number,
    Diff_Selector, Diversion, Reordering, Fizz_Buzz_Plus
  </advanced>
</by_difficulty>

<by_type>
  <string_text description="String/Text manipulation">
    Anagrams, Word_Wrap, Align_Columns, Best_Shuffle, Haiku_Review,
    Phone_Numbers, 12_Days_of_Xmas, Longest_Common_Prefix, Unsplice
  </string_text>
  <math_numbers description="Math & Numbers">
    Fizz_Buzz, Fizz_Buzz_Plus, Prime_Factors, Roman_Numerals, Reverse_Roman,
    Zeckendorf_Number, Number_Names, Combined_Number, Closest_To_Zero,
    Count_Coins, ISBN, LCD_Digits, Leap_Years, Five_Weekends, Friday_13th
  </math_numbers>
  <data_structures description="Data Structures & Algorithms">
    Recently_Used_List, Balanced_Parentheses, Calc_Stats, Remove_Duplicates,
    Array_Shuffle, Fisher_Yates_Shuffle, Levenshtein_Distance, Gray_Code,
    Number_Chains, Wonderland_Number, 100_doors, Magic_Square, Saddle_Points,
    Diff_Selector, Diversion, Reordering
  </data_structures>
  <game_logic description="Game Logic & Simulation">
    Game_of_Life, Bowling_Game, Tennis, Yatzy, Yatzy_Cutdown,
    Mine_Sweeper, Mine_Field, Mars_Rover, Reversi, Poker_Hands,
    Harry_Potter, Eight_Queens, Knights_Tour, Tiny_Maze, Monty_Hall,
    Vending_Machine, Print_Diamond, ABC_Problem, Group_Neighbours, Filename_Range
  </game_logic>
</by_type>
</kata_categories>

## Process

Use conversational AskUserQuestion flow. User can skip to suggestions at any point.

<execution_steps>

<step_1>
  <description>Ask about difficulty preference</description>
  <prompt>
    <message>What difficulty level interests you?</message>
    <options>
      <option value="beginner">
        <label>Beginner</label>
        <description>Simple logic, single function (Fizz_Buzz, Leap_Years, Prime_Factors...)</description>
      </option>
      <option value="intermediate">
        <label>Intermediate</label>
        <description>Multiple rules, edge cases (Roman_Numerals, Bowling_Game, Tennis...)</description>
      </option>
      <option value="advanced">
        <label>Advanced</label>
        <description>Complex algorithms, state (Game_of_Life, Mars_Rover, Mine_Sweeper...)</description>
      </option>
      <option value="skip">
        <label>Just show me suggestions!</label>
        <description>Skip questions and see kata recommendations</description>
      </option>
    </options>
  </prompt>
  <if value="skip">Jump to step_suggest</if>
  <set_variable>$DIFFICULTY = selected value</set_variable>
</step_1>

<step_2>
  <description>Ask about challenge type</description>
  <prompt>
    <message>What kind of challenge interests you?</message>
    <options>
      <option value="string_text">
        <label>String/Text</label>
        <description>Text manipulation, parsing, formatting</description>
      </option>
      <option value="math_numbers">
        <label>Math & Numbers</label>
        <description>Calculations, conversions, number theory</description>
      </option>
      <option value="data_structures">
        <label>Data Structures</label>
        <description>Lists, algorithms, transformations</description>
      </option>
      <option value="game_logic">
        <label>Game Logic</label>
        <description>Games, simulations, state machines</description>
      </option>
      <option value="skip">
        <label>Show me suggestions now!</label>
        <description>Skip remaining questions</description>
      </option>
    </options>
  </prompt>
  <if value="skip">Jump to step_suggest</if>
  <set_variable>$TYPE = selected value</set_variable>
</step_2>

<step_suggest>
  <description>Show kata suggestions based on filters</description>
  <logic>
    - Filter kata_categories by $DIFFICULTY (if set)
    - Filter by $TYPE (if set)
    - If no filters, pick 3 varied suggestions
    - Select 3 katas that match criteria
    - For each kata, fetch a preview or use the descriptions below
  </logic>
  <kata_descriptions>
    <!-- Beginner -->
    Fizz_Buzz: Print 1-100 replacing multiples of 3/5 with Fizz/Buzz
    Leap_Years: Determine if a year is a leap year (divisibility rules)
    Prime_Factors: Find prime factors of a number
    Word_Wrap: Wrap text to fit within a column width
    Closest_To_Zero: Find the number closest to zero from a list
    Remove_Duplicates: Remove duplicate elements from a list
    Array_Shuffle: Randomly shuffle array elements
    Friday_13th: Count Friday the 13ths in a given year
    Five_Weekends: Find months with 5 Fridays, Saturdays, and Sundays
    Number_Names: Convert numbers to English words (one, two, three...)
    Print_Diamond: Print a diamond shape of letters
    LCD_Digits: Display numbers as LCD-style digits
    Fisher_Yates_Shuffle: Implement the Fisher-Yates shuffle algorithm

    <!-- Intermediate -->
    Roman_Numerals: Convert Arabic numbers to Roman numerals
    Reverse_Roman: Convert Roman numerals back to Arabic numbers
    Bowling_Game: Score a 10-pin bowling game with spares/strikes
    Tennis: Track tennis game score with deuce/advantage
    Anagrams: Find all anagrams of a word from a dictionary
    ISBN: Validate ISBN-10 check digits
    Balanced_Parentheses: Check if brackets are properly balanced
    Calc_Stats: Calculate min/max/count/average from numbers
    Recently_Used_List: Implement a most-recently-used list
    Phone_Numbers: Convert phone numbers to words using keypad letters
    Combined_Number: Arrange numbers to form the largest combined number
    Group_Neighbours: Group adjacent equal elements in a list
    Longest_Common_Prefix: Find longest common prefix among strings
    Yatzy: Score a Yatzy dice game (full version)
    Yatzy_Cutdown: Simplified Yatzy scoring
    Harry_Potter: Calculate discounts for Harry Potter book sets
    Vending_Machine: Calculate change for vending machine purchases
    Count_Coins: Count ways to make change with given coins
    100_doors: Toggle 100 doors puzzle (open/close pattern)
    Haiku_Review: Validate haiku syllable structure (5-7-5)
    ABC_Problem: Spell words using lettered blocks
    Align_Columns: Align text into formatted columns
    Best_Shuffle: Shuffle string so no character stays in place
    Filename_Range: Generate filename sequences (file001, file002...)
    Unsplice: Reverse a string splice operation
    12_Days_of_Xmas: Generate "12 Days of Christmas" lyrics

    <!-- Advanced -->
    Game_of_Life: Conway's cellular automaton simulation
    Mars_Rover: Navigate a rover on a grid with commands (L/R/M)
    Mine_Sweeper: Generate numbers for a minesweeper grid
    Mine_Field: Place mines randomly on a grid
    Eight_Queens: Place 8 queens on a chessboard without conflicts
    Knights_Tour: Find a path visiting all squares on a chessboard
    Reversi: Implement Reversi/Othello game logic
    Poker_Hands: Compare and rank poker hands
    Levenshtein_Distance: Calculate edit distance between strings
    Magic_Square: Generate magic squares (rows/cols/diags sum equal)
    Saddle_Points: Find saddle points in a matrix
    Tiny_Maze: Solve a small maze pathfinding problem
    Gray_Code: Generate Gray code sequences
    Monty_Hall: Simulate the Monty Hall probability problem
    Number_Chains: Find chains where numbers link by digits
    Wonderland_Number: Find 6-digit number with multiplication property
    Zeckendorf_Number: Represent as sum of non-consecutive Fibonacci numbers
    Diff_Selector: Select differences between data sets
    Diversion: Route around obstacles
    Reordering: Reorder elements based on rules
    Fizz_Buzz_Plus: Extended FizzBuzz with additional rules
  </kata_descriptions>
  <prompt>
    <message>Here are 3 katas that match your criteria:</message>
    <options>
      <option value="kata_1">
        <label>{Kata_Name_1}</label>
        <description>{Description from kata_descriptions}</description>
      </option>
      <option value="kata_2">
        <label>{Kata_Name_2}</label>
        <description>{Description from kata_descriptions}</description>
      </option>
      <option value="kata_3">
        <label>{Kata_Name_3}</label>
        <description>{Description from kata_descriptions}</description>
      </option>
      <option value="more_suggestions">
        <label>Show me 3 different ones</label>
        <description>Same criteria, different suggestions</description>
      </option>
      <option value="more_questions">
        <label>Ask me more questions...</label>
        <description>Refine my preferences further</description>
      </option>
    </options>
  </prompt>
  <if value="more_suggestions">Pick 3 different katas matching same criteria, repeat step_suggest</if>
  <if value="more_questions">
    - If user skipped from step_1: Jump to step_1 (ask difficulty)
    - If user answered step_1 but skipped step_2: Jump to step_2 (ask type)
    - If user answered both: Jump to step_1 to reconsider from start
  </if>
  <set_variable>$SELECTED_KATA = selected kata name</set_variable>
</step_suggest>

<step_fetch>
  <description>Fetch kata content from cyber-dojo</description>
  <action>
    Use WebFetch to get:
    https://raw.githubusercontent.com/cyber-dojo/exercises-start-points/master/start-points/{$SELECTED_KATA}/readme.txt
  </action>
  <store>$KATA_CONTENT = fetched readme content</store>
</step_fetch>

<step_confirm>
  <description>Show full kata details and ask for language</description>
  <display>
    Present the full kata content to the user:

    ## {$SELECTED_KATA}

    **Difficulty:** {$DIFFICULTY_STARS based on category - ⭐ Beginner, ⭐⭐ Intermediate, ⭐⭐⭐ Advanced}

    ### Problem Description
    {$KATA_CONTENT from readme.txt}
  </display>
  <prompt>
    <message>What language will you use for this kata?</message>
    <options>
      <option value="typescript">
        <label>TypeScript + Vitest</label>
        <description>Modern test runner with great DX</description>
      </option>
      <option value="javascript">
        <label>JavaScript + Vitest</label>
        <description>Same great runner, no types</description>
      </option>
      <option value="python">
        <label>Python + pytest</label>
        <description>Simple and powerful testing</description>
      </option>
      <option value="back">
        <label>Show me other katas</label>
        <description>Go back to suggestions</description>
      </option>
    </options>
  </prompt>
  <note>User can also select "Other" to type a custom language/framework</note>
  <if value="back">Jump back to step_suggest</if>
  <set_variable>$LANGUAGE = selected value (or custom input)</set_variable>
</step_confirm>

<step_generate>
  <description>Generate kata files based on language</description>
  <action>Create the following files based on $LANGUAGE:</action>

  <file name="CHALLENGE.md">
# Kata: {$SELECTED_KATA}

## Difficulty
{$DIFFICULTY_STARS based on category}

## Problem
{$KATA_CONTENT from readme.txt}

## TDD Approach

Work through this kata using the red-green-refactor cycle:

1. **Red**: Write a failing test for the simplest case
2. **Green**: Write minimal code to pass
3. **Refactor**: Clean up while keeping tests green
4. **Repeat**: Add the next test case

## Source

[cyber-dojo: {$SELECTED_KATA}](https://cyber-dojo.org)
  </file>

  <file name="kata.ts" condition="$LANGUAGE == typescript">
/**
 * {$SELECTED_KATA}
 * See CHALLENGE.md for requirements
 */
export function solve(input: unknown): unknown {
  throw new Error("Not implemented - start with a failing test!");
}
  </file>

  <file name="kata.test.ts" condition="$LANGUAGE == typescript">
import { describe, it, expect } from "vitest";
import { solve } from "./kata";

describe("{$SELECTED_KATA}", () => {
  it.todo("should handle the simplest case");

  // Add your first real test here using the red-green-refactor cycle
});
  </file>

  <file name="kata.js" condition="$LANGUAGE == javascript">
/**
 * {$SELECTED_KATA}
 * See CHALLENGE.md for requirements
 */
export function solve(input) {
  throw new Error("Not implemented - start with a failing test!");
}
  </file>

  <file name="kata.test.js" condition="$LANGUAGE == javascript">
import { describe, it, expect } from "vitest";
import { solve } from "./kata.js";

describe("{$SELECTED_KATA}", () => {
  it.todo("should handle the simplest case");

  // Add your first real test here using the red-green-refactor cycle
});
  </file>

  <file name="kata.py" condition="$LANGUAGE == python">
"""
{$SELECTED_KATA}
See CHALLENGE.md for requirements
"""

def solve(input):
    raise NotImplementedError("Start with a failing test!")
  </file>

  <file name="test_kata.py" condition="$LANGUAGE == python">
import pytest
from kata import solve

class TestKata:
    def test_placeholder(self):
        """Remove this and add your first real test"""
        pytest.skip("Start with a failing test!")

    # Add your first real test here using the red-green-refactor cycle
  </file>

  <custom_language condition="$LANGUAGE is custom input (user typed via 'Other')">
    Generate appropriate boilerplate based on user's specified language:
    - CHALLENGE.md (always)
    - Implementation file with idiomatic naming and empty function
    - Test file using common test framework for that language

    Examples:
    - "Go" → kata.go + kata_test.go (testing package)
    - "Rust" → src/lib.rs + tests/kata_test.rs (cargo test)
    - "Java" → Kata.java + KataTest.java (JUnit)
    - "C#" → Kata.cs + KataTests.cs (xUnit/NUnit)
    - "Ruby" → kata.rb + kata_spec.rb (RSpec)
    - "Elixir" → kata.ex + kata_test.exs (ExUnit)
    - "Haskell" → Kata.hs + KataSpec.hs (Hspec)
    - "Clojure" → kata.clj + kata_test.clj (clojure.test)

    Use your knowledge of the language's conventions and popular test frameworks.
    Follow the same pattern: empty function that throws/raises "not implemented".
  </custom_language>

  <message>
    Kata setup complete!

    Created files:
    - CHALLENGE.md (problem description)
    {if $LANGUAGE != other}
    - Implementation file with empty solve() function
    - Test file with placeholder test
    {endif}

    Start practicing with `/red` to write your first failing test!
  </message>
</step_generate>

</execution_steps>

## Notes

- Kata content is fetched at runtime from cyber-dojo's GitHub repository
- The cyber-dojo project has been maintained for 10+ years with stable URLs
- All exercises are designed for TDD practice
- User can always go back to refine their preferences
- Boilerplate uses `solve()` as the main function - rename as needed for clarity
