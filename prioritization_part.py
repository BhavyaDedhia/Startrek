import re
from difflib import SequenceMatcher

###############################################################################
# 1) DETAILED, NESTED QUERY_CATEGORIES DICTIONARY
###############################################################################
query_categories = {
    "Account-Related": {
        "Personal Accounts": [
            "balance inquiry",
            "savings account issue",
            "current account details",
            "open personal account",
            "close personal account",
            "update personal details",
            "KYC verification"
        ],
        "Business/Corporate Accounts": [
            "business account opening",
            "corporate account transactions",
            "authorized signatory updates",
            "KYC for businesses"
        ],
        "Account for Pensioners": [
            "pension account opening",
            "pension credit inquiry",
            "life certificate submission",
            "special interest rates for pensioners"
        ],
        "Account for Armed Forces": [
            "salary credit schedule",
            "defense benefits inquiries",
            "special rate queries",
            "account opening under defense scheme"
        ],
        "Bank Employee Accounts": [
            "staff account benefits",
            "employee salary account",
            "concessional loan requests"
        ]
    },

    "Transactions & Payments": {
        "Domestic Transfers": [
            "fund transfer",
            "failed transaction",
            "UPI issue",
            "NEFT issue",
            "IMPS issue",
            "refund request",
            "chargeback"
        ],
        "High-Value & International Transfers": [
            "RTGS",
            "international payments",
            "cross-border transfer",
            "exchange rate queries"
        ],
        "Bill & Utility Payments": [
            "bill payment issue",
            "auto-debit setup",
            "utility payment failures",
            "refund tracking for bill payments"
        ],
        "Pension & Welfare Payments": [
            "pension disbursement",
            "government welfare scheme credit",
            "armed forces pension adjustments"
        ]
    },

    "Cards & Loans": {
        "Credit Cards": [
            "credit card application status",
            "limit increase request",
            "card block",
            "lost or stolen card",
            "card replacement",
            "fraud on credit card",
            "EMI on credit card",
            "interest rate on credit card"
        ],
        "Debit Cards": [
            "debit card block",
            "PIN reset",
            "card replacement request",
            "transaction failure at POS",
            "international usage enablement"
        ],
        "Loans": {
            "Personal Loan": [
                "loan application process",
                "personal loan interest rate",
                "repayment schedule",
                "loan foreclosure",
                "top-up loan request"
            ],
            "Home Loan": [
                "home loan eligibility",
                "disbursement process",
                "fixed vs floating interest rates",
                "property insurance requirements",
                "EMI or repayment issues"
            ],
            "Vehicle Loan": [
                "car loan application",
                "bike loan application",
                "EMI details",
                "vehicle insurance tie-ups",
                "repossessions and defaults"
            ],
            "Special Loan Schemes": [
                "loans for armed forces",
                "loans for pensioners",
                "staff loan benefits"
            ]
        }
    },

    "Fraud & Security": {
        "Unauthorized Activity": [
            "fraudulent transaction",
            "account hack",
            "phishing attempt",
            "scam alerts",
            "OTP misuse",
            "SIM swap issue",
            "suspicious login"
        ],
        "Disputes & Chargebacks": [
            "transaction dispute",
            "chargeback process",
            "dispute resolution timeline",
            "fraud case escalation"
        ],
        "Security Enhancements": [
            "enable 2FA",
            "biometric login security",
            "account monitoring setup",
            "security advice"
        ]
    },

    "Customer Support & Complaints": {
        "General Complaints": [
            "complaint registration",
            "service dissatisfaction",
            "branch complaint",
            "staff complaint",
            "grievance escalation"
        ],
        "Technical Support": [
            "login issues",
            "password reset assistance",
            "app bug reports",
            "online banking feature not working"
        ],
        "Feedback & Suggestions": [
            "product suggestion",
            "service improvement feedback",
            "website feedback",
            "mobile app feedback"
        ]
    },

    "Internet & Mobile Banking": {
        "Net Banking": [
            "net banking registration",
            "transaction limit increase",
            "two-factor authentication setup",
            "password reset or unlock",
            "statement download issue"
        ],
        "Mobile App": [
            "mobile app activation",
            "fingerprint login setup",
            "payment errors or failed UPI",
            "app crash or performance issue"
        ],
        "Online Services": [
            "e-statement subscription",
            "request new checkbook online",
            "virtual debit card",
            "bill pay integration"
        ]
    },

    "Investment & Insurance": {
        "Mutual Funds": [
            "fund selection advice",
            "SIP setup",
            "redemption process",
            "fund performance inquiries",
            "NAV queries"
        ],
        "Fixed Deposit (FD)": [
            "FD opening process",
            "premature withdrawal",
            "interest payout schedule",
            "FD renewal or extension",
            "maturity instructions"
        ],
        "Recurring Deposit (RD)": [
            "RD opening",
            "installment queries",
            "default handling",
            "maturity payout"
        ],
        "Insurance": [
            "policy coverage details",
            "premium payment",
            "claim process",
            "nominee updates",
            "ULIP queries"
        ]
    },

    "Others": {
        "General Inquiries": [
            "lobby or branch-related questions",
            "ATM location or service issue",
            "marketing calls",
            "promotional offers"
        ],
        "Non-Financial Requests": [
            "change of name or contact details",
            "address proof submission",
            "request for official letters",
            "miscellaneous certification"
        ],
        "Special Requests": [
            "armed forces special assistance",
            "pensioner special assistance",
            "VIP or HNI queries"
        ]
    }
}

###############################################################################
# 2) TOKENIZATION, SYNONYMS, FUZZY MATCHING, AND CLASSIFY_QUERY
###############################################################################

def tokenize(text):
    """
    Splits text into alphanumeric tokens (lowercased).
    Example: "How to block credit cards" -> ["how", "to", "block", "credit", "cards"]
    """
    return re.findall(r'\w+', text.lower())

def partial_similarity(a, b):
    """
    Returns a ratio [0..1] indicating how similar two strings are, using SequenceMatcher.
    """
    return SequenceMatcher(None, a, b).ratio()

# Basic synonyms map (extend as needed).
SYNONYMS = {
    "create": "open",
    "make": "open",
    "new": "open",
    "start": "open",
    "begin": "open",
    # synonyms for "close"
    "end": "close",
    # synonyms for "issue"
    "problem": "issue",
    "trouble": "issue",
    "difficulty": "issue",
}

def replace_synonyms(tokens):
    """
    If a token is in SYNONYMS, replace it with the mapped value.
    Otherwise, keep it as is.
    """
    replaced = []
    for t in tokens:
        if t in SYNONYMS:
            replaced.append(SYNONYMS[t])
        else:
            replaced.append(t)
    return replaced

def coverage_score(keyword, user_tokens):
    """
    Returns a float in [0..1] indicating how many keyword tokens match 
    the user tokens (partial similarity >= 0.8), 
    normalized by the number of tokens in the keyword.
    """
    keyword_tokens = tokenize(keyword)
    match_count = 0
    for kt in keyword_tokens:
        # Check best partial similarity vs. user tokens
        best_sim = max(partial_similarity(kt, ut) for ut in user_tokens)
        if best_sim >= 0.8:
            match_count += 1
    return match_count / len(keyword_tokens)

def classify_query(user_query, min_coverage_threshold=0.3):
    """
    Classify a user query into the best matching category path 
    (e.g. ("Cards & Loans", "Credit Cards")), 
    or ("Others",) if coverage is too low.
    """
    user_tokens_raw = tokenize(user_query)
    user_tokens = replace_synonyms(user_tokens_raw)
    
    best_score = 0.0
    best_path = ("Others",)  # fallback if coverage is too low

    # Traverse the nested categories
    for main_cat, sub_data in query_categories.items():
        if isinstance(sub_data, dict):
            for sub_cat, keywords_or_nested in sub_data.items():
                if isinstance(keywords_or_nested, list):
                    # Single-level keywords
                    for kw in keywords_or_nested:
                        score = coverage_score(kw, user_tokens)
                        if score > best_score:
                            best_score = score
                            best_path = (main_cat, sub_cat)
                elif isinstance(keywords_or_nested, dict):
                    # Deeper nesting (e.g. "Loans": { "Home Loan": [...] })
                    for nested_key, kw_list in keywords_or_nested.items():
                        for kw in kw_list:
                            score = coverage_score(kw, user_tokens)
                            if score > best_score:
                                best_score = score
                                best_path = (main_cat, sub_cat, nested_key)
        else:
            # If for some reason sub_data was a direct list
            for kw in sub_data:
                score = coverage_score(kw, user_tokens)
                if score > best_score:
                    best_score = score
                    best_path = (main_cat,)

    # If the best coverage is below threshold, classify as Others
    if best_score < min_coverage_threshold:
        return ("Others",)
    return best_path


###############################################################################
# 3) PRIORITIZATION LOGIC
###############################################################################

# (A) Base priority for MAIN categories
category_base_priority = {
    "Fraud & Security": 8,
    "Transactions & Payments": 7,
    "Cards & Loans": 6,
    "Account-Related": 5,
    "Internet & Mobile Banking": 4,
    "Customer Support & Complaints": 3,
    "Investment & Insurance": 3,
    "Others": 1
}

# (B) Additional priority for certain SUB-categories or nested categories
sub_category_boost = {
    "Unauthorized Activity": 2,    # e.g. Fraud & Security -> Unauthorized Activity
    "Disputes & Chargebacks": 1,
    "Credit Cards": 1,
    "Debit Cards": 0,
    "Home Loan": 1,
    "Personal Loan": 0,
    "Vehicle Loan": 0
    # Extend as needed
}

# (C) Additional priority for user attributes
user_attribute_weights = {
    "pensioner": 1,
    "armed_forces": 1,
    "hni": 2,   # High Net Worth Individual
    "bank_staff": 1,
    "excellent_credit_score": 1
}

# (D) Urgency mapping
urgency_factor = {
    "urgent": 3,
    "high": 2,
    "normal": 0,
    "low": -1
}

def compute_priority(category_path, user_profile, max_scale=10):
    """
    Computes a numeric priority for the classified query.

    1) Base priority from the main category.
    2) Optional subcategory / nested boosts.
    3) Add user attribute weights (pensioner, HNI, etc.).
    4) Add urgency factor.

    final_priority is capped at 'max_scale' and floored at 1 (so it won't go <1).
    """
    if not category_path:
        # fallback if something went off
        category_path = ("Others",)

    # 1) Base priority from the main category
    main_category = category_path[0]
    base = category_base_priority.get(main_category, 1)  # default to 1 if not found

    # 2) Subcategory / nested boosts
    boost = 0
    if len(category_path) >= 2:
        subcat = category_path[1]
        boost += sub_category_boost.get(subcat, 0)
        if len(category_path) == 3:
            nested_key = category_path[2]
            boost += sub_category_boost.get(nested_key, 0)

    # 3) User attribute weights
    attr_points = 0
    for attr, weight in user_attribute_weights.items():
        if user_profile.get(attr, False):  # if True in the profile
            attr_points += weight

    # 4) Urgency factor
    urgency_val = user_profile.get("urgency", "normal")
    urgency_pts = urgency_factor.get(urgency_val, 0)

    # Combine
    final_priority = base + boost + attr_points + urgency_pts

    # Cap at 'max_scale' if desired
    if final_priority > max_scale:
        final_priority = float(max_scale)

    # Also floor at 1 if negative or zero
    if final_priority < 1:
        final_priority = 1

    return final_priority


###############################################################################
# 4) DEMO / EXAMPLE USAGE
###############################################################################
if __name__ == "__main__":
    # A) Example queries
    queries = [
        "How to create a bank account?",
        "Block credit card now!",
        "My home loan EMI is not updated",
        "Pension credit inquiry please",
        "There's a fraudulent transaction on my account",
        "Need staff loan benefits details"
    ]

    # B) Sample user profiles
    # You can adapt or fetch this from a database in real scenarios
    user_profiles = [
        {
            "pensioner": False,
            "armed_forces": False,
            "hni": False,
            "bank_staff": False,
            "excellent_credit_score": False,
            "urgency": "normal"
        },
        {
            "pensioner": True,
            "armed_forces": False,
            "hni": True,
            "bank_staff": False,
            "excellent_credit_score": True,
            "urgency": "urgent"
        },
        {
            "pensioner": False,
            "armed_forces": True,
            "hni": False,
            "bank_staff": False,
            "excellent_credit_score": False,
            "urgency": "high"
        },
        {
            "pensioner": False,
            "armed_forces": False,
            "hni": False,
            "bank_staff": True,
            "excellent_credit_score": True,
            "urgency": "low"
        }
    ]

    print("===== DEMO: Classification + Prioritization =====\n")

    # C) Classify & prioritize each query for each user profile
    for query in queries:
        print(f"** User Query: '{query}' **\n")
        for i, profile in enumerate(user_profiles, start=1):
            cat_path = classify_query(query)
            priority_score = compute_priority(cat_path, profile, max_scale=10)

            print(f"  User Profile #{i}: {profile}")
            print(f"    -> Classification: {cat_path}")
            print(f"    -> Priority Score: {priority_score}\n")
        print("-" * 80, "\n")
