# Mortgage Journey

A retrospective mortgage calculator prototype built with React, TypeScript and Vite.

## What it does
- Mortgage journey timeline with purchase/remortgage stages
- Historical SDLT estimation by buyer situation and purchase date
- Overpayment events and interest/term counterfactuals
- Property value, mortgage balance and equity timeline
- Illustrative fixed-vs-tracker comparison using monthly Bank Rate observations
- ONS-anchored mortgage-vs-rent comparison
- Future rate planner: projects the balance at the end of a fixed period and estimates the lump sum needed at a future rate to keep a chosen monthly payment unchanged
- Browser-local storage plus JSON export/import

## Demo data
The built-in demo deliberately uses rounded illustration figures and does not contain the user's real mortgage figures.

## Important
All projections are estimates for education/planning. Real lender calculations can differ because of payment dates, fees, rate changes, ERC rules, product terms and affordability criteria.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
