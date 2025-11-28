import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  handle: string;
  status: string;
  published_at: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string;
  barcode: string;
  price: string;
  compare_at_price: string;
  weight: number;
  weight_unit: string;
  inventory_quantity: number;
  inventory_item_id: number;
  inventory_management: string;
  position: number;
  option1: string;
  option2: string;
  option3: string;
}

interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  src: string;
  alt: string;
  width: number;
  height: number;
  variant_ids: number[];
}

interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: store } = await supabase
      .from('shopify_stores')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!store) {
      return new Response(
        JSON.stringify({ error: 'No active Shopify store found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shopifyHeaders = {
      'X-Shopify-Access-Token': store.access_token,
      'Content-Type': 'application/json',
    };

    const baseUrl = `https://${store.shop_domain}/admin/api/${store.api_version}`;

    let allProducts: ShopifyProduct[] = [];
    let url = `${baseUrl}/products.json?limit=250`;
    let pageCount = 0;

    while (url && pageCount < 10) {
      const response = await fetch(url, { headers: shopifyHeaders });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API error:', response.status, errorText);
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const products = data.products || [];
      allProducts = allProducts.concat(products);

      const linkHeader = response.headers.get('Link');
      url = '';

      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          url = nextMatch[1];
        }
      }

      pageCount++;
    }

    console.log(`Fetched ${allProducts.length} products from Shopify`);

    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      try {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('shopify_product_id', product.id)
          .maybeSingle();

        const productData = {
          shopify_product_id: product.id,
          title: product.title,
          description: product.body_html,
          vendor: product.vendor,
          product_type: product.product_type,
          tags: product.tags ? product.tags.split(',').map(t => t.trim()) : [],
          status: product.status === 'active' ? 'active' : product.status === 'draft' ? 'draft' : 'archived',
          handle: product.handle,
          published_at: product.published_at,
          updated_at: new Date().toISOString(),
        };

        let productId: string;

        if (existingProduct) {
          const { data } = await supabase
            .from('products')
            .update(productData)
            .eq('id', existingProduct.id)
            .select('id')
            .single();
          productId = data.id;
        } else {
          const { data } = await supabase
            .from('products')
            .insert({ ...productData, created_at: new Date().toISOString() })
            .select('id')
            .single();
          productId = data.id;
        }

        for (const variant of product.variants) {
          const { data: existingVariant } = await supabase
            .from('product_variants')
            .select('id')
            .eq('shopify_variant_id', variant.id)
            .maybeSingle();

          const variantData = {
            shopify_variant_id: variant.id,
            product_id: productId,
            title: variant.title || 'Default',
            sku: variant.sku || `SKU-${variant.id}`,
            barcode: variant.barcode,
            price: parseFloat(variant.price),
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            weight: variant.weight,
            weight_unit: variant.weight_unit || 'kg',
            inventory_policy: 'deny',
            requires_shipping: true,
            taxable: true,
            position: variant.position || 0,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            updated_at: new Date().toISOString(),
          };

          let variantId: string;

          if (existingVariant) {
            const { data } = await supabase
              .from('product_variants')
              .update(variantData)
              .eq('id', existingVariant.id)
              .select('id')
              .single();
            variantId = data.id;
          } else {
            const { data } = await supabase
              .from('product_variants')
              .insert({ ...variantData, created_at: new Date().toISOString() })
              .select('id')
              .single();
            variantId = data.id;
          }

          let inventoryQuantity = 0;

          if (variant.inventory_item_id && variant.inventory_management === 'shopify') {
            try {
              const invResponse = await fetch(
                `${baseUrl}/inventory_levels.json?inventory_item_ids=${variant.inventory_item_id}`,
                { headers: shopifyHeaders }
              );

              if (invResponse.ok) {
                const invData = await invResponse.json();
                const levels = invData.inventory_levels as ShopifyInventoryLevel[];

                if (levels && levels.length > 0) {
                  inventoryQuantity = levels.reduce((sum, level) => sum + (level.available || 0), 0);
                }
              }
            } catch (invError) {
              console.error(`Error fetching inventory for variant ${variant.id}:`, invError);
            }
          }

          const { data: defaultLocation } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('is_default', true)
            .maybeSingle();

          if (defaultLocation) {
            const { data: existingInv } = await supabase
              .from('inventory_items')
              .select('id')
              .eq('variant_id', variantId)
              .eq('location_id', defaultLocation.id)
              .maybeSingle();

            if (existingInv) {
              await supabase
                .from('inventory_items')
                .update({
                  available: inventoryQuantity,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingInv.id);
            } else {
              await supabase
                .from('inventory_items')
                .insert({
                  variant_id: variantId,
                  location_id: defaultLocation.id,
                  available: inventoryQuantity,
                  committed: 0,
                  damaged: 0,
                  in_transit: 0,
                  reserved: 0,
                  reorder_point: 10,
                  reorder_quantity: 50,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
            }
          }
        }

        for (const image of product.images) {
          const { data: existingImage } = await supabase
            .from('product_images')
            .select('id')
            .eq('shopify_image_id', image.id)
            .maybeSingle();

          const imageData = {
            shopify_image_id: image.id,
            product_id: productId,
            image_url: image.src,
            alt_text: image.alt,
            position: image.position,
            width: image.width,
            height: image.height,
          };

          if (existingImage) {
            await supabase
              .from('product_images')
              .update(imageData)
              .eq('id', existingImage.id);
          } else {
            await supabase
              .from('product_images')
              .insert(imageData);
          }
        }

        synced++;
      } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        errors,
        total: allProducts.length,
        message: `Synced ${synced} products with inventory levels from Shopify.`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
