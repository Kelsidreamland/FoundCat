# FOUND CAT V1 Core Flow Design

## Goal

FOUND CAT V1 should make a first-time visitor immediately feel that they are browsing a cute global cat map: swipe through public cat cards, save cats they like, and easily jump to the world map to find a cat. The app should stay lightweight and playful while preserving a clear path for users to add and publicly share their own cats.

## Product Positioning

- Home is for browsing cute public cat cards from around the world.
- The map is for finding where cats can be encountered.
- My Cat Cards is for separating cats I personally found from cats I saved from the world.
- Login is not a front-door blocker. It is required only when the user needs cloud persistence or public contribution.

## Home Card Deck

### Default State

- Home defaults to the world public cat deck.
- The deck should feel like a cat-focused dating app, but all actions must remain positive.
- The deck does not require login.

### Card Information

Home cards should stay light and show only:

- cat photo
- cat name, or a friendly fallback name if missing
- city / region
- up to two short tags
- world number, for example `W-001`

Home cards must not show:

- full address
- raw coordinates
- Google Maps labels or raw map URLs
- encounter clue text
- long notes

### Gestures

- Left swipe saves the cat and advances to the next card.
- Right swipe advances to the next card.
- Saving must not interrupt the swipe flow.
- Tapping the card opens the bottom profile sheet.

## Home Profile Sheet

### Purpose

The bottom profile sheet lets the user quickly see more about a cat without leaving the home deck. It is a lightweight "one more look" profile, not a full detail page.

It exists to answer:

- Who is this cat?
- What is its vibe?
- Is there a useful encounter clue?
- Do I want to save it?
- Do I want to find it on the world map?

### Layout

The sheet opens from the bottom over the home deck. It should keep the current deck context visible enough that the user still feels they are on Home.

### Fields

Show these fields in order when data exists:

1. cat name
2. city / region
3. world number
4. vibe, shown as a short one- to two-line description
5. features, shown as a short one- to two-line description
6. `偶遇線索`
7. care status tags

Do not show fur color or breed in this sheet for V1. The photo already carries that information, and the sheet should not feel like a database form.

### Empty Profile State

If the cat has no vibe, feature note, encounter clue, or care status, show only:

`這隻貓還很神秘`

Do not render empty field labels.

### Actions

Primary CTA:

- `去找這隻喵`
- always visible
- does not require saving first
- opens the world map, centers the original public cat point, and opens that cat's map card

Secondary CTA:

- `收藏` when not saved
- `已收藏` when saved
- saving does not close the sheet and does not navigate away
- saved world cats are stored under My Cat Cards > `我收藏的貓`

## Save Flow

### First Save Guidance

The first time the user saves a world cat, show a bottom guidance layer:

- message: `已收藏到我的貓卡`
- CTA: `去找這隻喵`

The CTA opens the world map at that cat's original public point and opens the map card.

### Later Saves

Later saves should show only a lightweight confirmation, such as `已收藏`, and continue the deck.

### Public Contribution Reminder

After the user has saved three world cats, show a one-time soft prompt:

- message: `你已收藏 3 隻世界貓，要不要也分享一隻你遇到的貓？`
- CTA: `我也遇到貓貓了！`

The CTA opens the create-cat flow.

## My Cat Cards

### Tabs

My Cat Cards has two tabs:

1. `我遇到的貓`
2. `我收藏的貓`

### Found By Me

`我遇到的貓` contains cats the user personally added.

Rules:

- uses private card numbers, for example `No.001`
- can edit cat information
- can edit location
- can publish to the world map
- can unpublish if already public

### Saved World Cats

`我收藏的貓` contains world cats the user saved.

Rules:

- preserves the world number, for example `W-001`
- must not be renumbered into the private cat-number sequence
- can be viewed
- can open the world map through `去找這隻喵`
- cannot edit the original public cat data

### Private Notes

Saved world cats may have private notes.

Rules:

- visible only to the current user
- do not change the public world cat record
- do not sync back to the world map as public information
- optional

Examples:

- `下次去清邁想找牠`
- `這家咖啡店也想去`
- `朋友說牠下午比較常出現`
- `已經去找過一次，沒遇到`

## Map

### Default State

- The map defaults to `世界地圖`.
- It should not request GPS on initial map open.
- GPS should only be requested in flows where the user is adding or correcting a location.

### Modes

The map has a small mode switch:

- `世界地圖`
- `我的地圖`

### World Map

World Map shows all public cat points.

World cat map cards can:

- show basic cat information
- show `偶遇線索`
- show care status if present
- save the cat
- navigate through `去找這隻喵`

World cat map cards cannot:

- edit the original public cat data
- edit the original location

### My Map

My Map shows only cats the user personally added.

My cat map cards can:

- edit cat information
- edit location
- publish to the world map
- unpublish if already public
- navigate through `去找這隻喵`

Saved world cats do not appear in My Map in V1. They remain in My Cat Cards > `我收藏的貓`.

## Create And Publish Flow

### Add Cat

The user can add a cat locally without login.

After adding a cat and location:

- navigate to the map
- open the newly added cat's map card
- show a soft publish prompt

### Publish Prompt

Prompt copy:

`讓更多人也遇見牠？`

CTA:

`公開到世界地圖`

Publishing is encouraged but not required.

### Login Gate For Publishing

If the user is not logged in and taps `公開到世界地圖`, show:

`登入後才能把這隻貓公開到世界地圖，也能備份你的貓卡。`

Actions:

- `用 Email 登入`
- `稍後再說`

### Publish Success

After publish succeeds, show a memorable success state:

- `牠已加入世界地圖 W-023`
- `世界又多了一隻可以被偶遇的貓`

## Login And Backup

### No Login Required

Users can do these without login:

- browse world cat cards
- open the profile sheet
- view the world map
- tap `去找這隻喵`
- add local cats
- view local cat cards

### Login Required

Users must log in to:

- publish a cat to the world map
- back up their own cat cards
- save world-cat collections across devices
- save private notes across devices

Login should be introduced at the moment it is needed, not as a first-run wall.

## Public Author Information

V1 does not show:

- author name
- discoverer name
- author avatar
- user profile page
- follow author features

The main subject is the cat and its encounter place, not the contributor identity.

## Copy Decisions

Use:

- `偶遇線索` instead of `喜歡出沒`
- `去找這隻喵` for cat-finding CTAs
- `我也遇到貓貓了！` for the create-cat prompt

Existing copy that says `去找這隻貓` may be migrated gradually to `去找這隻喵` where it is a user-facing navigation CTA.

## Explicit Non-Goals For V1

Do not implement these in V1:

- cat speech / cat replies
- AI-generated cat names
- AI detection of the same cat
- cat matchmaking
- author profiles
- following users
- comments
- social feeds
- commercial ads
- hard login wall before browsing
- global contributor leaderboard

## Acceptance Criteria

- A first-time visitor can immediately browse public cat cards on Home without logging in.
- Home cards stay visually light and do not show encounter clue details.
- Tapping a Home card opens a bottom profile sheet with useful extra details.
- The profile sheet shows `這隻貓還很神秘` when no optional detail exists.
- `去找這隻喵` from Home or profile opens the world map at the original public cat point.
- Saving a world cat does not interrupt the deck.
- First save shows the guidance layer with `去找這隻喵`.
- My Cat Cards separates `我遇到的貓` from `我收藏的貓`.
- Saved world cats keep their `W-` world numbers and do not receive private `No.` numbers.
- The map defaults to `世界地圖` and does not request GPS on first open.
- Publishing a cat requires login, but browsing and local adding do not.
- No author/discoverer identity is shown in V1.
