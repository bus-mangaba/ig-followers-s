import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Modularized function to scrape Instagram data
async function scrapeInstagramProfile(igName) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Construct the URL dynamically based on the Instagram username
  const url = `https://www.instagram.com/${igName}/`;
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Extracting the og:description and og:title meta tag content
  const metaContent = await page.evaluate(() => {
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    
    return {
      ogDescription: ogDescription ? ogDescription.content : null,
      ogTitle: ogTitle ? ogTitle.content : null
    };
  });

  if (metaContent.ogDescription && metaContent.ogTitle) {
    // Extract the followers count
    const followersMatch = metaContent.ogDescription.match(/([\d.,]+)\s?(K|M|milhões|seguidores|followers)/i); // Handle K/M/thousands/millions
    
    let followers;
    if (followersMatch) {
      const followersNumber = parseFloat(followersMatch[1].replace(/,/g, '.')); // Replace commas with dots for decimal parsing
      const unit = followersMatch[2].toLowerCase();
      
      // Convert "K" to thousands, "M" to millions
      if (unit === 'k') {
        followers = followersNumber * 1000;
      } else if (unit === 'm' || unit === 'milhões') {
        followers = followersNumber * 1000000;
      } else {
        followers = followersNumber;
      }
    } else {
      followers = 'Followers not found';
    }

    // Extract the name from og:title, everything before "(@"
    const titleMatch = metaContent.ogTitle.match(/^(.+?)\s?\(@/); // Everything before "(@" is the name
    
    const name = titleMatch ? titleMatch[1].trim() : 'Name not found';

    await browser.close();
    
    // Return the scraped data
    return {
      name,
      followers
    };
  } else {
    await browser.close();
    throw new Error('Meta tag not found');
  }
}

// API Route to dynamically handle {ig_name}
export async function GET(req, { params }) {
  const { ig_name } = params;  // Extract Instagram username from route params
  
  try {
    // Use the modular function to scrape the Instagram profile
    const data = await scrapeInstagramProfile(ig_name);
    
    // Return the scraped data as JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    return NextResponse.json({ error: 'An error occurred while scraping' }, { status: 500 });
  }
}
