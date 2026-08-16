import sys

file_path = '/Users/hemanthkancharla/moneybe/routes/customers.js'
content = open(file_path).read()

# /update
content = content.replace(
    "const { name, email, phone, pan, aadhar, acc_number, referral_name, referral_phone } = req.body",
    "const { name, email, phone, pan, aadhar, acc_number, source, referral_name, referral_phone } = req.body"
)
content = content.replace(
    "SET name=$1, email=$2, phone=$3, pan=$4, aadhar=$5, acc_number=$6, referral_name=$7, referral_phone=$8\n       WHERE id=$9",
    "SET name=$1, email=$2, phone=$3, pan=$4, aadhar=$5, acc_number=$6, source=$7, referral_name=$8, referral_phone=$9\n       WHERE id=$10"
)
content = content.replace(
    "RETURNING id, name, email, phone, pan, aadhar, acc_number, referral_name, referral_phone`,",
    "RETURNING id, name, email, phone, pan, aadhar, acc_number, source, referral_name, referral_phone`,"
)
content = content.replace(
    "aadhar?.trim() || null, acc_number?.trim() || null, referral_name?.trim() || null, referral_phone?.trim() || null, req.params.id]",
    "aadhar?.trim() || null, acc_number?.trim() || null, source?.trim() || null, referral_name?.trim() || null, referral_phone?.trim() || null, req.params.id]"
)

with open(file_path, 'w') as f:
    f.write(content)

print('Done patching customers.js for update route')
