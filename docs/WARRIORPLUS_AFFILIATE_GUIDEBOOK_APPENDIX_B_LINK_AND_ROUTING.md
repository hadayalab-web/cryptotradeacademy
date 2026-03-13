# Appendix B - Link and Routing Appendix

This appendix is the operational map for affiliates.

Its purpose is simple:

- keep the routing clean
- keep the language lanes matched correctly
- keep the purchase flow accurate
- stop affiliates from using the wrong link at the wrong time

Use this appendix as a reference whenever you publish, reply, DM, or build a simple bridge page.

---

## 1. The Core Routing Rule

The standard route is:

`cold traffic -> Minimal -> warm interest -> Regular -> deeper paid value`

That means:

- cold traffic should usually go to `Minimal`
- warm traffic may go to `Minimal` or a short paid explanation
- hot traffic can go directly to the matching WarriorPlus affiliate link
- `KIBA` should only be introduced after `Regular` already makes sense

If you keep this sequence clean, conversion quality stays higher.

---

## 2. The Purchase Flow in Plain English

At the time of this guidebook draft, the public-facing flow is:

1. The buyer sees the offer on a post, reply, DM, bridge page, or Whop LP.
2. The buyer enters the purchase path for the correct language lane.
3. The actual checkout completes on WarriorPlus.
4. After payment, the current post-purchase process delivers access.
5. The buyer receives the appropriate Telegram access path for the purchased language lane.

**One-line summary for affiliates:** Purchase completes on WarriorPlus. Access is delivered by email after payment. Any language checkout delivers the full 6-language access pack by email.

For affiliates, the non-negotiable rule is:

- do not describe checkout as happening on Whop
- do not imply multiple checkout paths
- do not imply access is granted before WarriorPlus payment

---

## 3. Standard Placeholder Set

Chapters `01`, `09`, and `11` use simple placeholders so assets stay reusable.

For single-language use, the most common placeholders are:

- `{{minimal_link_en}}`
- `{{warriorplus_affiliate_link}}`
- `{{support_email}}`
- `{{brand_x_handle}}`

For multi-language deployment, expand them into language-specific placeholders:

| Purpose | EN | ES | PT | AR | KO | JA |
| ------------- | ------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| `Minimal` link | `{{minimal_link_en}}` | `{{minimal_link_es}}` | `{{minimal_link_pt}}` | `{{minimal_link_ar}}` | `{{minimal_link_ko}}` | `{{minimal_link_ja}}` |
| WarriorPlus affiliate link | `{{warriorplus_affiliate_link_en}}` | `{{warriorplus_affiliate_link_es}}` | `{{warriorplus_affiliate_link_pt}}` | `{{warriorplus_affiliate_link_ar}}` | `{{warriorplus_affiliate_link_ko}}` | `{{warriorplus_affiliate_link_ja}}` |

If you promote only one lane, the shorter generic placeholders are fine.

If you promote multiple lanes, use the language-specific form consistently.

---

## 4. Language Lane Reference

Use the correct public page and the correct matching WarriorPlus item for each language.

| Lang | Audience Lane | Whop LP | WarriorPlus Item Number | Paid Link Placeholder |
| ------------- | ------------- | ------------- | ------------- | ------------- |
| EN | English | `https://whop.com/trapdefence/btc-en-warriorplus/` | `wso_vqp3r4` | `{{warriorplus_affiliate_link_en}}` |
| ES | Spanish | `https://whop.com/trapdefence/btc-es-warriorplus/` | `wso_lxd2wq` | `{{warriorplus_affiliate_link_es}}` |
| PT | Portuguese | `https://whop.com/trapdefence/btc-pt-warriorplus/` | `wso_dqz789` | `{{warriorplus_affiliate_link_pt}}` |
| AR | Arabic | `https://whop.com/trapdefence/btc-ar-warriorplus/` | `wso_zn9g7p` | `{{warriorplus_affiliate_link_ar}}` |
| KO | Korean | `https://whop.com/trapdefence/btc-ko-warriorplus/` | `wso_vm68d9` | `{{warriorplus_affiliate_link_ko}}` |
| JA | Japanese | `https://whop.com/trapdefence/btc-ja-warriorplus/` | `wso_zv25jy` | `{{warriorplus_affiliate_link_ja}}` |

Important:

- affiliates should use their own WarriorPlus affiliate link for the matching item number
- do not paste a raw non-affiliate buy link if your goal is affiliate credit
- do not mix one language page with another language item number

---

## 5. Routing by Audience Temperature

Use this as the default map.

| Audience Temperature | Best First Link | Goal |
| ------------- | ------------- | ------------- |
| Cold | matching `Minimal` link | reduce friction and create recognition |
| Warm | matching `Minimal` link or short paid explanation | deepen interest |
| Hot | matching WarriorPlus affiliate link | convert clear buying intent |

The shortest practical rule is:

- public discovery -> `Minimal`
- intent capture -> `Minimal`
- paid clarification -> explain `Regular`
- buy-now intent -> WarriorPlus affiliate link

---

## 6. Language Matching Rules

The language of the copy, the page, and the paid link should usually match.

That means:

- English copy should route to the English lane
- Spanish copy should route to the Spanish lane
- Portuguese copy should route to the Portuguese lane
- Arabic copy should route to the Arabic lane
- Korean copy should route to the Korean lane
- Japanese copy should route to the Japanese lane

If you mismatch the lane, you create friction and lower trust.

Keep these brand terms in English when helpful:

- `Trap Defence BTC`
- `Minimal`
- `Regular`
- `KIBA`
- `Trap Score`

That preserves consistency across the global asset set.

---

## 7. Paid-Layer Delivery Logic

From an affiliate messaging perspective, the delivery story is:

1. payment completes on WarriorPlus
2. the system processes the purchase
3. the buyer receives post-purchase access instructions (full 6-language pack by email, regardless of which language lane they bought from)
4. the buyer joins the correct Telegram experience for that language lane

At the documentation level, the current process is tied to:

- WarriorPlus payment notification
- post-purchase email delivery
- Telegram invite routing

Do not promise:

- Whop checkout access
- instant pre-payment access
- alternate payment routes
- an off-book delivery flow that is not the current system

---

## 8. Review-Only Links and Internal References

Some project documents contain review-only or operational links.

These may include:

- approval-review Telegram invite links
- internal routing references
- implementation-facing environment variable names

Affiliates should not publish those directly unless they are explicitly approved for public use.

For customer-facing promotion, use:

- the correct `Minimal` entry link
- the correct WarriorPlus affiliate link
- the correct public language lane

That is enough.

---

## 9. Link Hygiene Rules

Before publishing any asset, confirm:

1. the language lane is correct
2. the CTA type matches the audience temperature
3. the paid link is your actual WarriorPlus affiliate link
4. the copy does not mention outdated coupon or trial language
5. the purchase flow description still matches the current WarriorPlus flow
6. you are not using multiple competing CTAs in one short asset

Good routing is simple routing.

---

## 10. Fast Examples

Use examples like these.

Cold public post:

```text
If BTC keeps shaking you out, start with the free defense layer:
{{minimal_link_en}}
```

Warm DM:

```text
If the free layer makes sense to you, the full paid environment is here:
{{warriorplus_affiliate_link_en}}
```

Multi-language discipline:

```text
Spanish post -> {{minimal_link_es}}
Japanese buyer asking how to buy -> {{warriorplus_affiliate_link_ja}}
```

Simple, matched routing beats clever routing.

---

## 11. The One-Sentence Summary

The right link for the right language and the right audience temperature is one of the easiest conversion wins in the entire affiliate system.
