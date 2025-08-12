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

/**
 * Lightweight helper to fetch public media URLs from a tweet without auth.
 * Uses Twitter's syndication endpoint.
 */
export const fetchTweetImageUrls = async (
  tweetId: string
): Promise<string[]> => {
  const extract = (obj: any): string[] => {
    if (!obj || typeof obj !== "object") return [];
    const urls: string[] = [];
    if (Array.isArray(obj.photos)) {
      for (const p of obj.photos) {
        const u = p?.url || p?.image_url || p?.src;
        if (typeof u === "string" && u.startsWith("http")) urls.push(u);
      }
    }
    if (Array.isArray(obj.mediaDetails)) {
      for (const m of obj.mediaDetails) {
        const u = m?.media_url_https || m?.media_url || m?.image_url;
        if (typeof u === "string" && u.startsWith("http")) urls.push(u);
      }
    }
    if (
      obj?.card?.binding_values?.photo_image_full_size_large?.image_value?.url
    ) {
      const u =
        obj.card.binding_values.photo_image_full_size_large.image_value.url;
      if (typeof u === "string" && u.startsWith("http")) urls.push(u);
    }
    return urls;
  };

  const headers = { accept: "application/json" } as const;
  try {
    const url1 = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(
      tweetId
    )}&lang=en`;
    const r1 = await fetch(url1, { headers });
    if (r1.ok) {
      const d1 = await r1.json();
      const u1 = extract(d1);
      if (u1.length) return u1;
    }
  } catch {}
  try {
    const url2 = `https://cdn.syndication.twimg.com/tweet?id=${encodeURIComponent(
      tweetId
    )}`;
    const r2 = await fetch(url2, { headers });
    if (r2.ok) {
      const d2 = await r2.json();
      const u2 = extract(d2);
      if (u2.length) return u2;
    }
  } catch {}
  return [];
};

// Authenticated via env vars (same creds as profile). Uses TweetDetail GraphQL.
export const fetchTweetImageUrlsWithEnvVars = async (
  tweetId: string
): Promise<string[]> => {
  const bearerToken = process.env.X_ADRIAAN_BEARER;
  const csrfToken = process.env.X_ADRIAAN_CSRF_TOKEN;
  const cookie = process.env.X_ADRIAAN_COOKIE;
  if (!bearerToken || !csrfToken || !cookie) return [];

  const variables = {
    focalTweetId: tweetId,
    with_rux_injections: false,
    rankingMode: "Relevance",
    includePromotedContent: true,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true,
  };

  const features = {
    rweb_video_screen_enabled: false,
    payments_enabled: false,
    rweb_xchat_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: true,
    responsive_web_grok_share_attachment_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
      true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    responsive_web_enhance_cards_enabled: false,
  } as const;

  const fieldToggles = {
    withArticleRichContentState: true,
    withArticlePlainText: false,
    withGrokAnalyze: false,
    withDisallowedReplyControls: false,
  } as const;

  const url = `https://x.com/i/api/graphql/oEUIqhz9YZjZVpE5i68Sfg/TweetDetail?variables=${encodeURIComponent(
    JSON.stringify(variables)
  )}&features=${encodeURIComponent(
    JSON.stringify(features)
  )}&fieldToggles=${encodeURIComponent(JSON.stringify(fieldToggles))}`;

  const res = await fetch(url, {
    headers: {
      accept: "*/*",
      authorization: `Bearer ${bearerToken}`,
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
      "x-twitter-active-user": "yes",
      "x-twitter-auth-type": "OAuth2Session",
      cookie,
      Referer: `https://x.com/i/status/${tweetId}`,
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    method: "GET",
  });
  if (!res.ok) return [];
  const data: any = await res.json();

  const urls: string[] = [];
  const instructions =
    data?.data?.threaded_conversation_with_injections_v2?.instructions ?? [];
  for (const inst of instructions) {
    const entries = inst?.entries ?? inst?.moduleEntries ?? [];
    for (const entry of entries) {
      const result =
        entry?.content?.itemContent?.tweet_results?.result ??
        entry?.item?.itemContent?.tweet_results?.result;
      if (result?.__typename !== "Tweet") continue;
      const restId = result?.rest_id;
      if (restId && String(restId) !== String(tweetId)) continue; // focal tweet only
      const legacy = result?.legacy ?? {};
      const ents = legacy?.extended_entities?.media || legacy?.entities?.media;
      if (Array.isArray(ents)) {
        for (const m of ents) {
          if (m?.type === "photo") {
            const u = m?.media_url_https || m?.media_url;
            if (typeof u === "string" && u.startsWith("http")) urls.push(u);
          }
        }
      }
    }
  }
  return urls;
};
