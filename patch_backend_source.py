import sys

file_path = '/Users/hemanthkancharla/moneybe/routes/customers.js'
content = open(file_path).read()

# /request
content = content.replace(
    "const { name, email, phone, pan, aadhar, branch, referral_name, referral_phone } = req.body",
    "const { name, email, phone, pan, aadhar, branch, source, referral_name, referral_phone } = req.body"
)
content = content.replace(
    "INSERT INTO customers \n        (name, email, phone, pan, aadhar, aadhar_img_url, pan_img_url, card_front_img_url, branch, referral_name, referral_phone, status, added_by) \n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', NULL)",
    "INSERT INTO customers \n        (name, email, phone, pan, aadhar, aadhar_img_url, pan_img_url, card_front_img_url, branch, source, referral_name, referral_phone, status, added_by) \n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NULL)"
)
content = content.replace(
    "[name, email, phone, pan, aadhar, aadhar_url, pan_url, card_url, branch, referral_name, referral_phone]",
    "[name, email, phone, pan, aadhar, aadhar_url, pan_url, card_url, branch, source, referral_name, referral_phone]"
)

# /add
content = content.replace(
    "const { name, email, phone, pan, aadhar, acc_number, branch, referral_name, referral_phone } = req.body",
    "const { name, email, phone, pan, aadhar, acc_number, branch, source, referral_name, referral_phone } = req.body"
)
content = content.replace(
    "INSERT INTO customers (name, email, phone, pan, aadhar, acc_number, added_by, branch, referral_name, referral_phone, created_at)\n       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())",
    "INSERT INTO customers (name, email, phone, pan, aadhar, acc_number, added_by, branch, source, referral_name, referral_phone, created_at)\n       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())"
)
content = content.replace(
    "aadhar?.trim() || null, acc_number?.trim() || null, req.user.id, validatedBranch,\n       referral_name?.trim() || null, referral_phone?.trim() || null]",
    "aadhar?.trim() || null, acc_number?.trim() || null, req.user.id, validatedBranch,\n       source?.trim() || null, referral_name?.trim() || null, referral_phone?.trim() || null]"
)

# /add-with-docs
content = content.replace(
    "const { name, email, phone, pan, aadhar, acc_number, aadhar_img_url, pan_img_url, card_front_img_url, branch, referral_name, referral_phone } = req.body",
    "const { name, email, phone, pan, aadhar, acc_number, aadhar_img_url, pan_img_url, card_front_img_url, branch, source, referral_name, referral_phone } = req.body"
)
content = content.replace(
    "INSERT INTO customers (name, email, phone, pan, aadhar, acc_number, added_by, aadhar_img_url, pan_img_url, card_front_img_url, branch, referral_name, referral_phone, created_at)\n       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())",
    "INSERT INTO customers (name, email, phone, pan, aadhar, acc_number, added_by, aadhar_img_url, pan_img_url, card_front_img_url, branch, source, referral_name, referral_phone, created_at)\n       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW())"
)
content = content.replace(
    "card_front_img_url?.trim() || null, validatedBranch,\n       referral_name?.trim() || null, referral_phone?.trim() || null]",
    "card_front_img_url?.trim() || null, validatedBranch,\n       source?.trim() || null, referral_name?.trim() || null, referral_phone?.trim() || null]"
)

with open(file_path, 'w') as f:
    f.write(content)

print('Done patching customers.js')
