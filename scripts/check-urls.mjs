import https from 'node:https';

const urls = [
  "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400",
  "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=400",
  "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
  "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400",
  "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=400",
  "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400",
  "https://images.unsplash.com/photo-1529429611278-0f66f2e7f31d?w=400",
  "https://images.unsplash.com/photo-1656423521731-9665583f100c?w=400",
  "https://images.unsplash.com/photo-1740132438754-fcb12ff1eb74?w=400",
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400",
  "https://images.unsplash.com/photo-1637333245124-db8d75a59b69?w=400",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
  "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400",
  "https://images.unsplash.com/photo-1583932274573-b39594a7b67a?w=400",
  "https://images.unsplash.com/photo-1742749620967-b465e0a82096?w=400",
  "https://images.unsplash.com/photo-1515443961218-a51367130e69?w=400",
  "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
  "https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?w=400",
  "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=400",
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400",
  "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=400",
  "https://images.unsplash.com/photo-1665007019442-180419b71e0d?w=400",
  "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400",
  "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400",
  "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400",
  "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
  "https://images.unsplash.com/photo-1744698276062-a0ffe2246318?w=400",
  "https://images.unsplash.com/photo-1663788225253-0d8458196a8e?w=400",
  "https://images.unsplash.com/photo-1590071089561-13691b4a34c0?w=400",
  "https://images.unsplash.com/photo-1624471747394-58bffa498291?w=400",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400",
  "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400",
  "https://images.unsplash.com/photo-1565299585323-38174c4a6471?w=400",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
  "https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=400",
  "https://images.unsplash.com/photo-1502910288415-7ec2ba6f5086?w=400",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400"
];

function check(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const id = url.split('photo-')[1].split('?')[0];
      resolve({ id, status: res.statusCode });
    });
    req.on('error', () => resolve({ id: url, status: 'ERR' }));
    req.on('timeout', () => { req.destroy(); resolve({ id: url, status: 'TIMEOUT' }); });
    req.end();
  });
}

for (const url of urls) {
  const result = await check(url);
  console.log(`${result.status} ${result.id}`);
}
