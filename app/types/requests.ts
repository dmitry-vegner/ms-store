// https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/Deals?Market=ar&ItemTypes=Game&deviceFamily=Windows.Xbox&count=200&skipitems=0
// IdItem 

export interface IdsResponse {
  PagingInfo: {
    TotalItems: number;
  };
  Items: {
    Id: string;
    ItemType: 'Game' | string;
    PredictedScore: number;
  }[];
}

export interface LocalizedProperty {
  DeveloperName: string;
  ProductDescription: string;
  ProductTitle: string;
  Language: string;
  Markets: string[];
}

export interface MarketProperty {
  RelatedProducts: {
    RelatedProductId: string;
    RelationshipType: 'addOnParent' | 'SellableBy' | 'Bundle' | 'Parent' | 'Extends' | string;
  }[];
}

export interface OrderManagementData {
  Price: {
    CurrencyCode: 'ARS' | string;
    ListPrice: number;
    MSRP: number;
    WholesaleCurrencyCode: 'ARS' | string;
    WholesalePrice: number;
  };
}

export interface DisplaySkuAvailability {
  Availabilities: {
    Actions: ('Purchase' | 'Redeem' | string)[];
    LastModifiedDate: string;
    Markets: string[];
    OrderManagementData: OrderManagementData;
  }[];
  Sku: {
    Properties: {
      Packages?: {
        MainPackageFamilyNameForDlc: string | null;
      }[];
    };
  };
}

export interface Product {
  ProductId: string;
  LocalizedProperties: LocalizedProperty[];
  MarketProperties: MarketProperty[];
  DisplaySkuAvailabilities: DisplaySkuAvailability[];
}

// https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=9NSQJNJQZ849,9P9RX18JFL1T,9NL5LK2TC9XR,9PP3N5N551GL,9P9M9QLLPHLL,9MX9SK4BW24X,9N3RJXBWDDKW,9N1VMR3CFL3T,9PJSD2FFQV56,9MT7X6ZPLLM4,9PHFGM9NKQHN,9PHC134MX421,9NNMJQ7DZVPR,9NPTXQMSBWPB,9MWLMCK5CWFG,9N412K9B4S46,9NF3D55F1K42,9PMS6BJWPVML,9PDJP21DTHPG,9PL3K4CZ6MS0&market=AR&languages=ru-ru
export interface GamesResponse {
  Products: Product[];
}
