import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCartIndex = cart.findIndex(item => item.id === productId);

      if (productInCartIndex === -1) {
        const stockInfo = await api.get<Stock>(`stock/${productId}`)
          .then(response => response.data);
        
        if (stockInfo.amount > 0) {
          const newItem = await api.get<Product>(`products/${productId}`)
            .then(response => response.data);
          newItem.amount = 1;

          const newCart = [...cart, newItem];

          setCart(newCart);

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      } else {
        const productInCart = cart[productInCartIndex];

        updateProductAmount({ 
          productId,
          amount: productInCart.amount + 1
        });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCartIndex = cart.findIndex(item => item.id === productId);

      if (productInCartIndex === -1) {
        throw new Error();
      }

      const newCart = cart.filter(item => item.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const stockInfo = await api.get(`stock/${productId}`)
        .then(response => response.data);

      if (stockInfo.amount >= amount) {
        const updatedCart = [...cart];
        
        let updatedProduct = updatedCart.find(product => product.id === productId);

        if (!updatedProduct) {
          throw new Error();
        }

        updatedProduct.amount = amount;

        setCart(updatedCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
