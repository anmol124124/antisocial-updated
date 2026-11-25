import { Router } from 'express';
import { listCatalogs, searchCatalogProducts, getProduct } from '../gelatoClient.js';

const router = Router();

// GET /api/catalogs -> list product categories (apparel, mugs, wall-art, ...)
router.get('/catalogs', async (req, res, next) => {
  try {
    res.json(await listCatalogs());
  } catch (err) {
    next(err);
  }
});

// POST /api/catalogs/:catalogUid/search -> filter products within a category
router.post('/catalogs/:catalogUid/search', async (req, res, next) => {
  try {
    res.json(await searchCatalogProducts(req.params.catalogUid, req.body));
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:productUid -> variants, print areas, pricing for one product
router.get('/products/:productUid', async (req, res, next) => {
  try {
    res.json(await getProduct(req.params.productUid));
  } catch (err) {
    next(err);
  }
});

export default router;
