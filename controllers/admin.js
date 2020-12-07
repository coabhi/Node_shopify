const Product = require('../models/product');
const {validationResult} = require('express-validator/check');
const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    errorMessage : null,
    hasError : false,
    validationErrors : []
  });
};

exports.postAddProduct = (req, res, next) => {
  const editMode = req.query.edit;
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description.trim();
  if(!image){
    return res.staus(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      errorMessage : 'attached file is not Image',
      hasError : true,
      product : {
        title : title,
        price : price,
        description : description
      },
      validationErrors : []
    });
  }
  const imageUrl = image.path;
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  const errors = validationResult(req);
  if(!errors.isEmpty())
  {
    console.log(errors.array());
    return res.staus(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: editMode,
      errorMessage : errors.array()[0].msg,
      hasError : true,
      product : {
        title : title,
        price : price,
        description : description
      },
      validationErrors : errors.array()
    });
  }
  product
    .save()
    .then(result => {
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err =>
      {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError : false,
        errorMessage : null,
        validationErrors : []
      });
    })
    .catch(err =>
      {
        console.log(err);
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description.trim();
  
  const errors = validationResult(req);
  if(!errors.isEmpty())
  {
    console.log(errors.array());
    return res.render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: false,
      errorMessage : errors.array()[0].msg,
      hasError : true,
      product : {
        title : updatedTitle,
        price : updatedPrice,
        description : updatedDesc,
        _id : prodId
      },
      validationErrors : errors.array()
    });
  }
  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image)
      {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save()
      .then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err =>
      {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId : req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch(err =>
      {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then(product =>{
    if(!product){
      return next(new Error('Product not found'));
    }
  fileHelper.deleteFile(product.imageUrl);
  return Product.deleteOne({_id : prodId,userId : req.user._id});
  }).then(() => {
      console.log('DESTROYED PRODUCT');
      res.status(200).json({message : 'Success'});
    })
    .catch(err =>
    {
      res.status(500).json({message:'Deleting Product failed'});
    });
};
