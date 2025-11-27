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

    const shopifyUrl = `https://${store.shop_domain}/admin/api/${store.api_version}/products.json`;
    const shopifyHeaders = {
      'X-Shopify-Access-Token': store.access_token,
      'Content-Type': 'application/json',
    };

    const shopifyResponse = await fetch(`${shopifyUrl}?limit=250`, {
      headers: shopifyHeaders,
    });

    if (!shopifyResponse.ok) {
      throw new Error(`Shopify API error: ${shopifyResponse.statusText}`);
    }

    const { products } = await shopifyResponse.json();

    let synced = 0;
    let errors = 0;

    for (const product of products as ShopifyProduct[]) {
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
            .insert(productData)
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
            title: variant.title,
            sku: variant.sku,
            barcode: variant.barcode,
            price: parseFloat(variant.price),
            compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            weight: variant.weight,
            weight_unit: variant.weight_unit,
            position: variant.position,
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
              .insert(variantData)
              .select('id')
              .single();
            variantId = data.id;
          }

          const { data: defaultLocation } = await supabase
            .from('inventory_locations')
            .select('id')
            .eq('is_default', true)
            .maybeSingle();

          if (defaultLocation) {
            await supabase
              .from('inventory_items')
              .upsert({
                variant_id: variantId,
                location_id: defaultLocation.id,
                available: variant.inventory_quantity || 0,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'variant_id,location_id'
              });
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
        total: products.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
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
