export interface TwitterProfile {
  avatar: string;
  name: string;
  bio?: string;
  verified?: boolean;
  followersCount?: number;
  followingCount?: number;
}

export interface TwitterAPIResponse {
  data?: {
    user?: {
      result?: {
        __typename?: string;
        id?: string;
        rest_id?: string;
        avatar?: {
          image_url: string;
        };
        core?: {
          created_at?: string;
          name?: string;
          screen_name?: string;
        };
        is_blue_verified?: boolean;
        legacy?: {
          name?: string;
          description?: string;
          profile_image_url_https?: string;
          followers_count?: number;
          friends_count?: number;
          verified?: boolean;
          default_profile?: boolean;
          default_profile_image?: boolean;
          statuses_count?: number;
          favourites_count?: number;
          listed_count?: number;
          media_count?: number;
          normal_followers_count?: number;
          fast_followers_count?: number;
          url?: string;
          entities?: {
            description?: {
              urls?: Array<{
                display_url?: string;
                expanded_url?: string;
                url?: string;
                indices?: number[];
              }>;
            };
            url?: {
              urls?: Array<{
                display_url?: string;
                expanded_url?: string;
                url?: string;
                indices?: number[];
              }>;
            };
          };
        };
        location?: {
          location?: string;
        };
        professional?: {
          rest_id?: string;
          professional_type?: string;
          category?: Array<{
            id?: number;
            name?: string;
            display?: boolean;
            icon_name?: string;
          }>;
        };
        verification?: {
          verified?: boolean;
        };
        verification_info?: {
          is_identity_verified?: boolean;
          reason?: {
            description?: {
              text?: string;
              entities?: Array<{
                from_index?: number;
                to_index?: number;
                ref?: {
                  url?: string;
                  url_type?: string;
                };
              }>;
            };
            verified_since_msec?: string;
          };
        };
        privacy?: {
          protected?: boolean;
        };
      };
    };
  };
}

/**
 * Fetches Twitter profile data for a given handle
 * @param handle Twitter handle without @ symbol
 * @param bearerToken Twitter API bearer token
 * @param csrfToken Twitter CSRF token
 * @param cookie Twitter session cookie
 * @returns Promise<TwitterProfile | null>
 */
export const fetchTwitterProfile = async (
  handle: string,
  bearerToken: string,
  csrfToken: string,
  cookie: string
): Promise<TwitterProfile | null> => {
  try {
    const cleanHandle = handle.replace(/^@/, "");

    const variables = {
      screen_name: cleanHandle,
      withGrokTranslatedBio: false,
    };

    const features = {
      hidden_profile_subscriptions_enabled: true,
      payments_enabled: false,
      rweb_xchat_enabled: false,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    };

    const fieldToggles = {
      withAuxiliaryUserLabels: true,
    };

    const url = `https://x.com/i/api/graphql/gEyDv8Fmv2BVTYIAf32nbA/UserByScreenName?variables=${encodeURIComponent(
      JSON.stringify(variables)
    )}&features=${encodeURIComponent(
      JSON.stringify(features)
    )}&fieldToggles=${encodeURIComponent(JSON.stringify(fieldToggles))}`;

    const response = await fetch(url, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.5",
        authorization: `Bearer ${bearerToken}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": `"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"`,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": `"macOS"`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-csrf-token": csrfToken,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-client-language": "en",
        cookie: cookie,
        Referer: `https://x.com/${cleanHandle}`,
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TwitterAPIResponse = await response.json();
    const userResult = data.data?.user?.result;
    const userLegacy = userResult?.legacy;

    console.log("Twitter API response:", JSON.stringify(data, null, 2));

    if (!userResult || !userLegacy) {
      return null;
    }

    // Process avatar URL - prefer avatar.image_url, fallback to legacy
    let avatar =
      userResult.avatar?.image_url || userLegacy.profile_image_url_https || "";
    if (avatar) {
      avatar = avatar.replace("_normal", "_400x400"); // Twitter's largest standard size
      // For even higher quality, you could try _bigger or remove size suffix entirely
      // avatar = avatar.replace('_normal', ''); // This gives original size
    }

    // Determine verification status - check both legacy verified and blue verified
    const verified =
      userLegacy.verified || userResult.is_blue_verified || false;

    return {
      avatar,
      name: userResult.core?.name || userLegacy.name || "",
      bio: userLegacy.description,
      verified,
      followersCount: userLegacy.followers_count,
      followingCount: userLegacy.friends_count,
    };
  } catch (error) {
    console.error("Error fetching Twitter profile:", error);
    return null;
  }
};

/**
 * Utility function to use environment variables for Twitter API credentials
 * Requires TWITTER_BEARER_TOKEN, TWITTER_CSRF_TOKEN, and TWITTER_COOKIE env vars
 */
export const fetchTwitterProfileWithEnvVars = async (
  handle: string
): Promise<TwitterProfile | null> => {
  console.log(process.env);

  const bearerToken = process.env.X_ADRIAAN_BEARER;
  const csrfToken = process.env.X_ADRIAAN_CSRF_TOKEN;
  const cookie = process.env.X_ADRIAAN_COOKIE;

  if (!bearerToken || !csrfToken || !cookie) {
    console.error("Missing required Twitter API environment variables");
    return null;
  }

  return fetchTwitterProfile(handle, bearerToken, csrfToken, cookie);
};
