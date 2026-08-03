-- Reset admin password to "test123"
UPDATE users SET password_hash = '77a8af2d441839f20ea39664ab6967e2:5561e183e241c9f022f21ba5681f7cc71771dfaecf99ff8704329a8f1f88447a2857342625aa389e12a4c7d844112361c4789b40c3e09b8ddac114842f68b6b7' WHERE account = 'admin';
