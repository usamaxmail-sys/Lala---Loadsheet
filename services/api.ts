import { ApiCredentials, LeopardsLoadsheetResponse } from '../types';

// Base URLs from documentation
const LEOPARDS_BASE_URL = 'https://merchantapi.leopardscourier.com/api'; // Production
// const LEOPARDS_BASE_URL_STAGING = 'https://merchantapistaging.leopardscourier.com/api'; 

const POSTEX_BASE_URL = 'https://api.postex.pk/services/integration/api/order/v2';

/**
 * Generate Load Sheet for Leopards Courier
 * Reference: Page 34-37 of Documentation
 */
export const generateLeopardsLoadsheet = async (
  creds: ApiCredentials,
  cnNumbers: string[]
): Promise<LeopardsLoadsheetResponse> => {
  if (!creds.leopardsApiKey || !creds.leopardsApiPassword) {
    throw new Error('Missing Leopards API Credentials');
  }

  const payload = {
    api_key: creds.leopardsApiKey,
    api_password: creds.leopardsApiPassword,
    cn_numbers: cnNumbers,
    // Optional fields if needed based on doc, usually mostly cn_numbers is critical
    // courier_name: '...', 
    // courier_code: '...'
  };

  try {
    const response = await fetch(`${LEOPARDS_BASE_URL}/generateLoadSheet/format/json/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Leopards API Error: ${response.statusText}`);
    }

    const data: LeopardsLoadsheetResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Leopards API call failed", error);
    throw error;
  }
};

/**
 * Download Leopards Loadsheet PDF
 * Reference: Page 37 of Documentation
 */
export const downloadLeopardsPDF = async (
  creds: ApiCredentials,
  loadSheetId: string
): Promise<Blob> => {
   const payload = {
    api_key: creds.leopardsApiKey,
    api_password: creds.leopardsApiPassword,
    load_sheet_id: loadSheetId,
    response_type: 'PDF'
  };

  const response = await fetch(`${LEOPARDS_BASE_URL}/downloadLoadSheet/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to download PDF');
  return await response.blob();
}

/**
 * Generate Load Sheet for PostEx Courier
 * Reference: Page 16 of PostEx Documentation
 */
export const generatePostExLoadsheet = async (
  creds: ApiCredentials,
  trackingNumbers: string[]
): Promise<Blob> => {
  if (!creds.postExToken) {
    throw new Error('Missing PostEx API Token');
  }

  const payload = {
    trackingNumbers: trackingNumbers,
    // pickupAddress: "Optional Address" 
  };

  try {
    const response = await fetch(`${POSTEX_BASE_URL}/generate-load-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': creds.postExToken, // Token in header as per doc
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PostEx API Error: ${response.status} - ${errorText}`);
    }

    // PostEx returns the PDF file directly
    return await response.blob();
  } catch (error) {
    console.error("PostEx API call failed", error);
    throw error;
  }
};
